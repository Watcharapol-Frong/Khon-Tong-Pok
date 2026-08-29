"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, MessageCircle, Send, Sparkle } from "lucide-react";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { JobSeekerAuthGuard } from "@/components/JobSeekerAuthGuard";
import { Navbar } from "@/components/Navbar";
import { getJobSeekerProfile, markChatFlowComplete, syncComputerSkills } from "@/lib/actions/jobSeeker";
import { uploadResumeFile } from "@/lib/actions/resumeFile";
import { extractTextFromPdf } from "@/lib/pdf";
import { expandKnownAliases, matchSkills } from "@/lib/ahoCorasick";
import { useJobSeekerSession } from "@/lib/jobSeekerSessionContext";
import onetSkills from "@/data/onet_skills_dictionary_full.json";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  extractedSkills?: string[];
}

// A bounded, scripted flow rather than open-ended chat: 3 STAR-format
// behavioral turns that surface soft-skill evidence (hard skills are no
// longer collected via an open-ended chat question — /decoder's gate
// guarantees at least one already exists, from a resume upload or the
// manual form, before this chat is ever reachable at all). After the
// final turn's reply the conversation is marked complete and the input is
// replaced with a CTA into the profile, so there's a defined endpoint
// instead of unlimited free chat.
const SCRIPTED_PROMPTS = [
  'ก่อนไปต่อ ขอน้องตรงปกถามแบบ STAR สักหน่อยนะครับ — เล่าสถานการณ์ที่คุณเคยเจอปัญหางานยากๆ ให้ฟังหน่อยได้ไหมครับ? (Situation คุณเจอสถานการณ์อะไร และ Task คุณต้องทำอะไร)',
  "แล้วคุณลงมือทำอย่างไรครับ (Action) และผลลัพธ์ที่ได้เป็นอย่างไรบ้าง (Result)?",
  "เกือบเสร็จแล้วครับ! มีเครื่องมือ ซอฟต์แวร์ หรือทักษะอื่นที่คุณถนัดอีกไหมครับ อยากเก็บให้ครบก่อนสรุปโปรไฟล์",
] as const;

const TOTAL_QUESTION_STAGES = SCRIPTED_PROMPTS.length;

const COMPLETION_MESSAGE =
  "ขอบคุณมากครับ! น้องตรงปกเก็บข้อมูลครบตามที่ต้องการแล้ว พร้อมไปดู Smart Profile ของคุณได้เลยครับ";

// Shown when a reply yields zero hard skills — asks specifically for
// tools/software instead of silently moving on to the next scripted
// question, since a vague answer otherwise just slips through unprobed.
const SKILL_PROBE_FOLLOWUP =
  "ลองเจาะจงอีกนิดได้ไหมครับ — ตอนนั้นคุณใช้เครื่องมือ ซอฟต์แวร์ หรือทักษะเฉพาะอะไรบ้าง? (เช่น ชื่อโปรแกรม ภาษาที่ใช้เขียนโค้ด หรือ Framework ที่ถนัด)";

// The candidate's name always comes from their logged-in session, and by
// the time this chat is reachable at all (see the gate in DecoderContent)
// at least one hard skill is already on record — so the greeting welcomes
// them by name and jumps straight into the first STAR question, instead of
// asking what they're good at or who they are. Takes the profile's most
// recent work experience (if the candidate filled out the manual form) so
// the greeting can reference it directly, making the STAR question feel
// specific to them rather than generic. Needs both, hence built inside the
// component rather than as a module-level constant.
function buildInitialMessages(name: string, recentJob?: { jobTitle: string; companyName: string }): ChatMessage[] {
  const jobIntro = recentJob
    ? `เห็นว่าคุณเคยทำงานตำแหน่ง ${recentJob.jobTitle} ที่ ${recentJob.companyName} มาก่อนครับ `
    : "";
  return [
    {
      id: "1",
      sender: "ai",
      text: `สวัสดีครับคุณ${name}! ผมคือน้องตรงปก ผู้ช่วย AI สำหรับวิเคราะห์ทักษะจากประสบการณ์ของคุณ ผมเห็นข้อมูลทักษะเบื้องต้นที่คุณให้ไว้แล้วครับ ${jobIntro}ทีนี้ขอถามเพิ่มอีก ${SCRIPTED_PROMPTS.length} ข้อสั้นๆ เพื่อให้เข้าใจประสบการณ์การทำงานจริงของคุณมากขึ้นครับ\n\n${SCRIPTED_PROMPTS[0]}`,
      time: "10:30 น.",
    },
  ];
}

/** isCurrent wins outright; otherwise the entry with the latest startDate. Entries are ordered by form-entry order (sortOrder), not necessarily chronologically, so this can't just take workExperience[0]. */
function pickMostRecentJob(
  workExperience: { jobTitle: string; companyName: string; isCurrent: boolean; startDate: Date | null }[]
): { jobTitle: string; companyName: string } | undefined {
  if (workExperience.length === 0) return undefined;
  const current = workExperience.find((w) => w.isCurrent);
  if (current) return current;
  return [...workExperience].sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0))[0];
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DecoderPage() {
  return (
    <JobSeekerAuthGuard>
      <DecoderContent />
    </JobSeekerAuthGuard>
  );
}

function DecoderContent() {
  const { jobSeeker } = useJobSeekerSession();
  // Seeded with a generic placeholder greeting at mount, then replaced with
  // the real (possibly job-personalized) one once the hydration effect
  // below resolves — the chat panel itself never renders before that
  // finishes anyway (see the gate), so this is never visibly shown.
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages(jobSeeker.name));
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Sentinel div at the end of the feed — scrolled into view whenever the
  // message list or the typing indicator changes, same as any real chat
  // app keeping the latest message in view instead of leaving the reader
  // to notice and scroll down manually.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "skills">("chat");
  // Resume skills are replaced wholesale on each new upload (a new resume
  // supersedes the old one); chat skills accumulate across the conversation.
  // The panel shows the union of both, deduped.
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [chatSkills, setChatSkills] = useState<string[]>([]);
  const confirmedSkills = Array.from(new Set([...resumeSkills, ...chatSkills]));
  // Chat is only reachable once at least one hard skill is already on
  // record (from a resume upload or the manual form at /decoder/manual) —
  // see the gate in the render below. Gated only once hydration confirms
  // there really is nothing on record yet, not before (isHydrated false
  // would otherwise flash the gate for a returning candidate who already
  // has skills, right before their real data loads in).
  const hasAnySkill = confirmedSkills.length > 0;
  // Skills merged in the last ~1.6s — the sidebar panel gives these a
  // brief highlight so a newly-detected skill is noticeable instead of
  // just silently appearing in the list.
  const [recentlyAddedSkills, setRecentlyAddedSkills] = useState<Set<string>>(new Set());

  // Merges newly-found skills into chatSkills and flags whichever of them
  // weren't already in the combined list for the brief highlight above.
  // Used for both the local matcher (runs on every message, immediately —
  // no need to wait on Gemini) and Gemini's own returned skills.
  const mergeChatSkills = (found: string[]) => {
    if (!found.length) return;
    const brandNew = found.filter((s) => !confirmedSkills.includes(s));
    setChatSkills((prev) => Array.from(new Set([...prev, ...found])));
    if (brandNew.length) {
      setRecentlyAddedSkills((prev) => new Set([...prev, ...brandNew]));
      setTimeout(() => {
        setRecentlyAddedSkills((prev) => {
          const next = new Set(prev);
          brandNew.forEach((s) => next.delete(s));
          return next;
        });
      }, 1600);
    }
  };
  const [isChatLoading, setIsChatLoading] = useState(false);
  // Which scripted question turn we're on (0-indexed); reaching
  // TOTAL_QUESTION_STAGES marks the guided conversation as complete.
  const [questionStage, setQuestionStage] = useState(0);
  const isConversationComplete = questionStage >= TOTAL_QUESTION_STAGES;
  // Marks the Smart Profile "complete" in the database (see
  // markChatFlowComplete) the moment the STAR flow finishes — this is the
  // persisted signal /login uses to route a returning candidate straight
  // to /profile instead of back through the chat. Guarded with a ref (not
  // state) so it fires exactly once per visit even though
  // isConversationComplete stays true on every subsequent render.
  const hasMarkedCompleteRef = useRef(false);
  useEffect(() => {
    if (!isConversationComplete || hasMarkedCompleteRef.current) return;
    hasMarkedCompleteRef.current = true;
    markChatFlowComplete(jobSeeker.id, confirmedSkills);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-checking when isConversationComplete flips; confirmedSkills is read at that moment via closure, not tracked as a re-trigger
  }, [isConversationComplete]);
  // True once the current stage has already been probed for skills once
  // (see handleSendMessage) — a vague, skill-free answer gets asked to be
  // more specific instead of the flow just moving on, but only once per
  // stage so a candidate who genuinely has nothing more to add isn't stuck.
  const [probedThisStage, setProbedThisStage] = useState(false);
  // Raw text of the most recently uploaded resume — only set by
  // handleResumeUpload. Re-sent on every DB sync below (not just right
  // after upload) so a chat-only skill update doesn't need to special-case
  // "was there ever a resume"; the upsert in syncComputerSkills leaves
  // resumeRawText untouched when this is empty.
  const [resumeRawText, setResumeRawText] = useState("");
  // True once this candidate's existing JobSeekerProfile (if any) has been
  // fetched — the DB-sync effect below must not fire before this, or it
  // would overwrite real prior data with the empty initial state.
  const [isHydrated, setIsHydrated] = useState(false);

  // /profile still reads the candidate's name from localStorage (it wasn't
  // part of this round's migration) — this used to get written whenever
  // the chat resolved a name, which no longer happens now that it always
  // comes from the session, so it's mirrored here once instead.
  useEffect(() => {
    localStorage.setItem("ktp_username", jobSeeker.name);
  }, [jobSeeker.name]);

  useEffect(() => {
    let cancelled = false;
    getJobSeekerProfile(jobSeeker.id).then((profile) => {
      if (cancelled) return;
      if (profile) {
        // Seeded into chatSkills (which only ever accumulates) rather than
        // resumeSkills (which a new upload replaces wholesale) — this way
        // a fresh resume upload this session can't clobber skills the
        // candidate already had on record from a previous visit.
        setChatSkills(profile.computerSkills);
        setResumeRawText(profile.resumeRawText);
      }
      const recentJob = pickMostRecentJob(profile?.workExperience ?? []);
      setMessages(buildInitialMessages(jobSeeker.name, recentJob));
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobSeeker.id/name are stable for the lifetime of this page (set once by the guard)
  }, []);

  // /profile reads both of these — the union for the skills list itself,
  // and resumeSkills separately so it can show "Verified" (came from an
  // actual document) vs "Partial" (self-reported in chat only) the same
  // way HR's own candidate report distinguishes hard-skill confidence.
  // Without this the whole point of this chat (building a Smart Profile)
  // dead-ends once the candidate navigates away. Also mirrored into the
  // real database (JobSeekerProfile.computerSkills), keyed off the logged-in
  // jobSeeker's id, once initial hydration has completed.
  useEffect(() => {
    const union = Array.from(new Set([...resumeSkills, ...chatSkills]));
    localStorage.setItem("ktp_hard_skills", JSON.stringify(union));
    localStorage.setItem("ktp_resume_skills", JSON.stringify(resumeSkills));
    if (!isHydrated) return;
    syncComputerSkills(jobSeeker.id, {
      computerSkills: union,
      ...(resumeRawText ? { resumeRawText } : {}),
    });
  }, [resumeSkills, chatSkills, resumeRawText, isHydrated, jobSeeker.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isChatLoading]);

  // Re-focus the input once a reply lands and it's enabled again, so the
  // candidate can keep typing the next answer without clicking back in.
  useEffect(() => {
    if (!isChatLoading) inputRef.current?.focus();
  }, [isChatLoading]);

  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isChatLoading || isConversationComplete) return;
    if (!inputText.trim()) return;

    const userQuery = inputText.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userQuery,
      time: nowLabel(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    // Clicking the send button (vs. pressing Enter) moves focus to the
    // button — real chat apps keep focus in the input so you can keep
    // typing right away instead of having to click back in every time.
    inputRef.current?.focus();

    // A stray typo or an accidental Enter shouldn't burn one of the
    // bounded turns — the candidate would lose a real answer slot and
    // we'd still have gained no usable data from it. Ask them to
    // elaborate instead, without advancing questionStage or touching
    // the skill matcher/API.
    if (userQuery.length < 3) {
      setTimeout(() => {
        const aiReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "ข้อความสั้นไปหน่อยครับ ขอรายละเอียดเพิ่มอีกนิดได้ไหมครับ จะได้สกัดข้อมูลได้แม่นยำขึ้น",
          time: nowLabel(),
        };
        setMessages((prev) => [...prev, aiReply]);
      }, 500);
      return;
    }

    const greetName = `คุณ${jobSeeker.name}`;

    // Runs on every message, not just as a Gemini-unavailable fallback —
    // it's a local, synchronous match, so the skills panel can update
    // immediately instead of waiting on a network round-trip, and it
    // catches anything Gemini's own extraction might miss. It also drives
    // the adaptive-probe decision below, so it has to run before that.
    const locallyMatchedSkills = matchSkills(expandKnownAliases(userQuery), [
      ...onetSkills.hardSkills,
      ...onetSkills.softSkills,
    ]);
    mergeChatSkills(locallyMatchedSkills);

    // This message's turn in the bounded flow — captured once so both the
    // Gemini path and its local-matcher fallback append the same suffix
    // regardless of which one ends up serving the reply. questionStage N
    // means "the reply being processed right now answers
    // SCRIPTED_PROMPTS[N]" (question 0 was already asked directly in the
    // greeting — see buildInitialMessages), so the *next* question to ask
    // is SCRIPTED_PROMPTS[N + 1].
    const currentStage = questionStage;
    const isFinalStage = currentStage === TOTAL_QUESTION_STAGES - 1;
    // A fixed script would move to the next scripted question even from a
    // vague, skill-free answer, leaving real hard skills uncollected. If
    // this reply found nothing and we haven't already asked once this
    // stage, probe for specifics instead of advancing — only once, so a
    // candidate who genuinely has nothing more isn't stuck repeating.
    const shouldProbe = locallyMatchedSkills.length === 0 && !probedThisStage;
    const stageSuffix = shouldProbe
      ? `\n\n${SKILL_PROBE_FOLLOWUP}`
      : isFinalStage
        ? `\n\n${COMPLETION_MESSAGE}`
        : `\n\n${SCRIPTED_PROMPTS[currentStage + 1]}`;
    if (shouldProbe) {
      setProbedThisStage(true);
    } else {
      setQuestionStage(currentStage + 1);
      setProbedThisStage(false);
    }

    const replyWithLocalMatcher = () => {
      const baseText = locallyMatchedSkills.length
        ? `เยี่ยมมากครับ${greetName}! จากประสบการณ์ที่คุณเล่าเรื่อง "${userQuery.slice(0, 25)}..." ระบบสกัดและเพิ่มทักษะที่เกี่ยวข้อง ${locallyMatchedSkills.length} รายการให้อัตโนมัติแล้ว`
        : `ขอบคุณครับ${greetName}! ยังไม่พบคำที่ตรงกับฐานข้อมูลทักษะจากข้อความนี้ครับ ลองพิมพ์ชื่อเครื่องมือให้ชัดเจนและสะกดถูกต้อง เช่น Python, NumPy, scikit-learn ดูนะครับ`;

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `${baseText}${stageSuffix}`,
        time: nowLabel(),
        ...(locallyMatchedSkills.length ? { extractedSkills: locallyMatchedSkills } : {}),
      };
      setMessages((prev) => [...prev, aiReply]);
    };

    setIsChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userQuery,
          // Same combined vocabulary as the local-matcher fallback below —
          // otherwise Gemini can never recognize soft skills (e.g. "Critical
          // Thinking") since it's instructed to only return verbatim matches
          // from whatever list it's given.
          hardSkills: [...onetSkills.hardSkills, ...onetSkills.softSkills],
        }),
      });

      if (!res.ok) {
        throw new Error(`/api/chat returned ${res.status}`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(`/api/chat unavailable: ${data.error ?? "unknown reason"}`);
      }

      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      const skills: string[] = Array.isArray(data.skills)
        ? data.skills.filter((s: unknown): s is string => typeof s === "string")
        : [];

      if (!reply) {
        throw new Error("/api/chat returned an empty reply");
      }

      // locallyMatchedSkills was already merged above; Gemini may surface
      // additional skills beyond what the local matcher caught (or none
      // new at all) — mergeChatSkills dedupes either way.
      mergeChatSkills(skills);

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `${reply}${stageSuffix}`,
        time: nowLabel(),
        ...(skills.length ? { extractedSkills: skills } : {}),
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      // Expected, handled condition (network hiccup, quota, timeout) — the
      // local matcher fallback below covers it, so this isn't a real error.
      // console.warn (not .error) so Next.js's dev overlay doesn't treat a
      // routine fallback as a crash.
      console.warn("Gemini chat unavailable, falling back to local matcher:", err);
      replyWithLocalMatcher();
    } finally {
      setIsChatLoading(false);
    }
  };

  /** Shared by the real file-input handler below and the dev-only "sample resume" shortcut — same parsing/upload path regardless of where the File object came from. */
  const processResumeFile = async (file: File) => {
    setUploadedFile(file.name);
    setIsParsingResume(true);

    try {
      const text = await extractTextFromPdf(file);
      if (text.trim().length < 20) {
        throw new Error("PDF has no extractable text layer");
      }

      const matchedSkills = matchSkills(expandKnownAliases(text), onetSkills.hardSkills);
      // A new resume replaces the previous resume's skills (not a union) —
      // an old file's stale skills shouldn't linger once it's been swapped
      // out. Chat-derived skills are untouched.
      setResumeSkills(matchedSkills);
      // Triggers the DB-sync effect above to persist this resume's raw
      // text into the profile along with the current skill union.
      setResumeRawText(text);

      // Fire-and-forget: uploads the actual PDF (not just its extracted
      // text) so HR sees the real file once Blind Review unblinds, instead
      // of the text-only fallback. Doesn't block the chat flow or surface
      // an error here — a failed upload just means that fallback stays in
      // effect, not a broken resume submission.
      const uploadFormData = new FormData();
      uploadFormData.set("file", file);
      uploadResumeFile(jobSeeker.id, uploadFormData).catch((err) => {
        console.error("uploadResumeFile failed:", err);
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: matchedSkills.length
            ? `น้องตรงปกวิเคราะห์ไฟล์ PDF "${file.name}" เรียบร้อยแล้ว! พบและเพิ่มทักษะที่เกี่ยวข้อง ${matchedSkills.length} รายการให้อัตโนมัติแล้วครับ`
            : `น้องตรงปกอ่านไฟล์ PDF "${file.name}" ได้แล้วครับ แต่ยังไม่พบคำที่ตรงกับฐานข้อมูลทักษะ ลองพิมพ์ชื่อเครื่องมือให้ชัดเจนและสะกดถูกต้อง เช่น Python, NumPy, scikit-learn ในแชทได้เลยครับ`,
          time: nowLabel(),
          ...(matchedSkills.length ? { extractedSkills: matchedSkills } : {}),
        },
      ]);
    } catch (err) {
      console.error("Resume PDF parsing failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `น้องตรงปกไม่สามารถอ่านข้อความจากไฟล์ "${file.name}" ได้ครับ (ไฟล์อาจเป็นภาพสแกนที่ไม่มีข้อความ หรือไฟล์เสียหาย) ลองแนบไฟล์ PDF อื่น หรือพิมพ์เล่าประสบการณ์ในแชทแทนได้เลยครับ`,
          time: nowLabel(),
        },
      ]);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file) return;
    await processResumeFile(file);
    inputEl.value = "";
  };

  // Dev-only: fetches the bundled sample PDF (public/sample-resume) and
  // runs it through the exact same parse/upload path as a real file-input
  // pick, so testing the chat flow doesn't require a real resume on hand
  // each time. Gated out of production the same way as /login's quick-login
  // shortcut.
  const handleUseSampleResume = async () => {
    try {
      const res = await fetch("/sample-resume/daniel-gan-frontend-developer.pdf");
      const blob = await res.blob();
      const file = new File([blob], "Daniel_Gan_-_Resume_-_Front_End_Developer.pdf", { type: "application/pdf" });
      await processResumeFile(file);
    } catch (err) {
      console.error("handleUseSampleResume failed:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <AssessmentStepBar currentStep={3} />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-4 sm:px-6 sm:py-8 md:px-8">
        {/* Background Grid Pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.04) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 40%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 40%,#000 40%,transparent 100%)",
          }}
        />

        <div className="relative w-full max-w-[1040px]">
          {/* Main Card Container with Mobile-Optimized Padding */}
          <div className="relative rounded-[24px] sm:rounded-[28px] bg-[#F5F5F5] p-3 sm:p-[clamp(20px,4vw,36px)]">
            <div className="absolute -top-3 -left-3 -z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#4D7CFF]" />

            {/* Header */}
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4">
              <div className="mb-1 inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-[#5C5C5C]">
                วิเคราะห์และดึงประสิทธิภาพโดยน้องตรงปก
              </div>
              <h1 className="text-[clamp(18px,4vw,28px)] font-extrabold tracking-[-0.02em]">
                ห้องสนทนากับน้องตรงปก
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#8A8A8A]">
                แนบไฟล์เรซูเม่ PDF หรือพิมพ์ชื่อเครื่องมือ/ทักษะที่ถนัด (เช่น Python, Excel, Adobe Photoshop, Critical Thinking) ให้น้องตรงปกช่วยสกัดทักษะวิชาชีพ
              </p>
            </div>

            {!isHydrated ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <Image
                  src="/mascot/mascot-ai-thinking.png"
                  alt=""
                  width={96}
                  height={96}
                  className="animate-pulse"
                  priority
                />
                <p className="text-sm text-[#8A8A8A]">กำลังโหลด...</p>
              </div>
            ) : !hasAnySkill ? (
              <div className="rounded-2xl bg-white p-5 text-center sm:p-8">
                <Image
                  src="/mascot/mascot-start.png"
                  alt=""
                  width={120}
                  height={120}
                  className="mx-auto h-[88px] w-[88px] object-contain"
                />
                <p className="mx-auto mt-3 max-w-[440px] text-xs leading-relaxed text-[#5C5C5C] sm:text-sm">
                  กรุณาอัปโหลดเรซูเม่หรือกรอกข้อมูลก่อน เพื่อให้น้องตรงปกเริ่มคุยกับคุณได้
                </p>

                <div className="mx-auto mt-5 grid max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Option 1: upload resume PDF — same handleResumeUpload
                      used post-unlock for re-uploads, so there's only one
                      parsing code path regardless of when it's triggered. */}
                  <label
                    className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                      isParsingResume
                        ? "cursor-not-allowed border-[rgba(15,15,15,0.15)] bg-[#FAFAFA]"
                        : "border-[rgba(15,15,15,0.2)] hover:border-[#0F0F0F] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    {isParsingResume ? (
                      <Loader2 className="h-6 w-6 animate-spin text-[#8A8A8A]" strokeWidth={1.75} />
                    ) : (
                      <FileText className="h-6 w-6 text-[#8A8A8A]" strokeWidth={1.75} />
                    )}
                    <span className="text-xs font-bold text-[#0F0F0F]">
                      {isParsingResume ? `กำลังอ่านไฟล์ "${uploadedFile}"...` : "อัปโหลดเรซูเม่ PDF"}
                    </span>
                    <span className="text-[10px] text-[#8A8A8A]">รองรับ PDF ไม่เกิน 10MB</span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={isParsingResume}
                      onChange={handleResumeUpload}
                      className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                  </label>

                  {/* Option 2: manual entry form (/decoder/manual) — writes
                      straight to the same JobSeekerProfile row, so
                      returning here immediately satisfies hasAnySkill and
                      unlocks chat. */}
                  <Link
                    href="/decoder/manual"
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[rgba(15,15,15,0.12)] p-5 text-center transition-colors hover:border-[#0F0F0F] hover:bg-[#FAFAFA]"
                  >
                    <Sparkle className="h-6 w-6 text-[#8A8A8A]" strokeWidth={1.75} />
                    <span className="text-xs font-bold text-[#0F0F0F]">กรอกฟอร์มด้วยตัวเอง</span>
                    <span className="text-[10px] text-[#8A8A8A]">เลือกทักษะที่คุณถนัดเอง</span>
                  </Link>
                </div>

                {/* Public — not gated to dev/localhost. Lets a visitor
                    (especially one who came in through the "กดข้ามได้เลย"
                    guest shortcut on /login or /register) see the whole
                    upload → skill-extraction → Smart Profile journey
                    without needing a real resume on hand, via the exact
                    same processResumeFile path a real upload uses. */}
                <button
                  type="button"
                  onClick={handleUseSampleResume}
                  disabled={isParsingResume}
                  className="mx-auto mt-3 flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-[rgba(15,15,15,0.2)] px-3.5 py-2 text-[11px] font-bold text-[#5C5C5C] transition-colors hover:bg-[#F5F5F5] disabled:opacity-60"
                >
                  <Sparkle className="h-3 w-3" strokeWidth={2} />
                  ยังไม่มีเรซูเม่ตอนนี้? ลองด้วยเรซูเม่ตัวอย่าง
                </button>
              </div>
            ) : (
              <>
            {/* Mobile View Tab Switcher (Chat vs Confirmed Skills) */}
            <div className="mb-3 flex lg:hidden gap-1 rounded-xl bg-[rgba(15,15,15,0.05)] p-1">
              <button
                type="button"
                onClick={() => setActiveMobileTab("chat")}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-center text-xs font-extrabold transition-all ${
                  activeMobileTab === "chat"
                    ? "bg-white text-[#0F0F0F]"
                    : "text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> ห้องแชทน้องตรงปก
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("skills")}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-center text-xs font-extrabold transition-all ${
                  activeMobileTab === "skills"
                    ? "bg-white text-[#0F0F0F]"
                    : "text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                <Sparkle className="h-3.5 w-3.5" strokeWidth={2} /> ทักษะที่สกัดได้ ({confirmedSkills.length})
              </button>
            </div>

            {/* UNIFIED CHATROOM INTERFACE */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-10">
              {/* Left: Chat & Upload Area */}
              <div
                className={`flex flex-col rounded-2xl bg-white p-2.5 sm:p-4 lg:col-span-7 ${
                  activeMobileTab === "chat" ? "block" : "hidden lg:flex"
                }`}
              >
                {/* Conversation header — identifies exactly who/what the
                    candidate is talking to (an AI chatbot), the same way a
                    real messaging app labels the other party in a thread. */}
                <div className="mb-3 flex items-center gap-2.5 sm:mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-[#F5F5F5] sm:h-11 sm:w-11">
                      <Image
                        src="/mascot/chatbot-avatar.png"
                        alt=""
                        width={88}
                        height={88}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[#3BF55C] ring-2 ring-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-[#0F0F0F]">น้องตรงปก</span>
                      <span className="rounded-full bg-[rgba(77,124,255,0.12)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#4D7CFF] uppercase">
                        AI Chatbot
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8A8A8A]">ผู้ช่วยวิเคราะห์ทักษะ • ออนไลน์</div>
                  </div>
                </div>

                {/* Mobile-Optimized Compact PDF Resume Upload Box */}
                <div className="relative mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-[rgba(15,15,15,0.2)] bg-[#FAFAFA] p-2.5 sm:p-3 transition-all hover:border-[#0F0F0F] hover:bg-white">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-xs font-bold text-[#0F0F0F]">
                        {isParsingResume ? (
                          <>
                            <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" strokeWidth={2.5} />
                            <span className="truncate">กำลังอ่านไฟล์ &quot;{uploadedFile}&quot;...</span>
                          </>
                        ) : uploadedFile ? (
                          <span className="truncate">✓ แนบสำเร็จ: {uploadedFile}</span>
                        ) : (
                          <span className="truncate">แนบไฟล์เรซูเม่ PDF (Optional)</span>
                        )}
                      </div>
                      <span className="hidden sm:inline text-[10px] text-[#8A8A8A]">
                        ลากวาง หรือ คลิกอัปโหลด (รองรับ PDF ไม่เกิน 10MB)
                      </span>
                      <span className="inline sm:hidden text-[10px] text-[#8A8A8A]">
                        คลิกเพื่อเลือกไฟล์ (PDF ≤ 10MB)
                      </span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10px] sm:text-xs font-bold text-[#0F0F0F]">
                    {isParsingResume ? "กำลังประมวลผล..." : uploadedFile ? "เปลี่ยนไฟล์" : "อัปโหลด"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isParsingResume}
                    onChange={handleResumeUpload}
                    className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Message History Feed */}
                <div className="flex min-h-[300px] max-h-[380px] sm:min-h-[340px] sm:max-h-[420px] scroll-smooth flex-col gap-3 overflow-y-auto pr-1">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={`flex items-end gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {msg.sender === "ai" && (
                        <div className="mb-4 h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-[#F5F5F5]">
                          <Image
                            src="/mascot/chatbot-avatar.png"
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-[#0F0F0F] text-white rounded-br-none"
                              : "bg-[#F5F5F5] text-[#0F0F0F] rounded-bl-none"
                          }`}
                        >
                          {msg.text}
                          {msg.extractedSkills && (
                            <div className="mt-2 flex flex-wrap gap-1.5 pt-2">
                              <span className="w-full text-[10px] font-bold text-[#4D7CFF]">
                                เพิ่มเข้าโปรไฟล์ให้อัตโนมัติแล้ว:
                              </span>
                              {msg.extractedSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded-lg bg-[#4D7CFF] px-2 py-1 text-[10px] font-bold text-white"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="mt-1 text-[9px] text-[#8A8A8A]">{msg.time}</span>
                      </div>
                    </motion.div>
                  ))}
                  <AnimatePresence>
                    {isChatLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-end gap-2"
                      >
                        <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-[#F5F5F5]">
                          <Image
                            src="/mascot/chatbot-avatar.png"
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-1 rounded-2xl rounded-bl-none bg-[#F5F5F5] px-3.5 py-2.5">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A] [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A] [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A]" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Form — resume attachment lives solely in the
                    dedicated upload box above; this input is text-only so
                    it can't be confused with a second, redundant file
                    upload path. Bounded to TOTAL_QUESTION_STAGES turns —
                    once complete, the input is replaced by a CTA into the
                    profile instead of allowing unlimited free chat. */}
                {isConversationComplete ? (
                  <Link
                    href="/profile"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F0F0F] py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] sm:py-3"
                  >
                    ไปที่ Smart Profile ของคุณ →
                  </Link>
                ) : (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-semibold text-[#8A8A8A]">
                      {`คำถามที่ ${questionStage + 1} / ${TOTAL_QUESTION_STAGES}`}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="พิมพ์คำตอบของคุณ..."
                        disabled={isChatLoading}
                        className="min-w-0 flex-1 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs outline-none focus:border-[#0F0F0F] disabled:opacity-60"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || !inputText.trim()}
                        aria-label="ส่งข้อความ"
                        className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#0F0F0F] text-white transition-transform active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
                      >
                        <Send className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Right: Confirmed Skill Statements Sidebar */}
              <div
                className={`flex flex-col justify-between rounded-2xl bg-[#FAFAFA] p-3 sm:p-4 lg:col-span-3 ${
                  activeMobileTab === "skills" ? "block" : "hidden lg:flex"
                }`}
              >
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F0F0F]">
                      <Sparkle className="h-3.5 w-3.5" strokeWidth={2} /> ทักษะเชิงรุกที่สกัดได้
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#8A8A8A]">
                      {confirmedSkills.length} ทักษะ
                    </span>
                  </div>
                  <p className="mb-2.5 text-[10px] text-[#8A8A8A]">
                    น้องตรงปกสกัดและเพิ่มทักษะเหล่านี้ให้อัตโนมัติ
                  </p>

                  {/* Minimal Skill Pills List */}
                  <div className="flex min-h-[220px] max-h-[320px] sm:min-h-[280px] sm:max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-0.5">
                    {confirmedSkills.length === 0 && (
                      <p className="text-[11px] text-[#8A8A8A]">
                        ยังไม่มีทักษะที่สกัดได้ — แนบเรซูเม่ PDF หรือพิมพ์เล่าประสบการณ์ในแชท แล้วน้องตรงปกจะสกัดและเพิ่มทักษะให้ที่นี่โดยอัตโนมัติ
                      </p>
                    )}
                    {confirmedSkills.map((sk) => {
                      // Brief highlight so a skill that just got detected
                      // mid-conversation is noticeable, not just a silent
                      // new row in the list — see mergeChatSkills.
                      const isNew = recentlyAddedSkills.has(sk);
                      return (
                        <div
                          key={sk}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#0F0F0F] transition-colors duration-[1400ms] ${
                            isNew ? "bg-[rgba(77,124,255,0.18)] ring-1 ring-[#4D7CFF]" : "bg-white"
                          }`}
                        >
                          <span className="truncate">{sk}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Link
                  href="/profile"
                  className="mt-3 sm:mt-4 flex w-full items-center justify-center rounded-full bg-[#0F0F0F] py-3 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
                >
                  ยืนยันสร้าง Smart Profile
                </Link>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
