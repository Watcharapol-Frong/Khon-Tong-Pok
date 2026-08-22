"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, Loader2, MessageCircle, Send, Sparkle } from "lucide-react";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { extractTextFromPdf, guessNameFromResumeText } from "@/lib/pdf";
import { matchSkills } from "@/lib/ahoCorasick";
import onetSkills from "@/data/onet_skills_dictionary_full.json";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  extractedSkills?: string[];
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "ai",
    text: "สวัสดีครับ! ผมคือน้องตรงปก ผู้ช่วย AI สำหรับวิเคราะห์ทักษะจากประสบการณ์ของคุณ ก่อนอื่นขอทราบชื่อผู้สมัครหน่อยได้ไหมครับ? (หรือถ้าแนบเรซูเม่ PDF ด้านบน ผมจะลองอ่านชื่อจากในไฟล์ให้อัตโนมัติเลยครับ) หลังจากนั้นจะมีคำถามสั้นๆ อีก 4 ข้อ ครอบคลุมทั้งทักษะที่ถนัดและสถานการณ์การทำงานจริงครับ",
    time: "10:30 น.",
  },
];

// A bounded, scripted flow rather than open-ended chat: 2 free-text turns
// for hard-skill extraction (stage 0, stage 3) bookend 2 STAR-format
// behavioral questions (stage 1, stage 2) that surface soft-skill
// evidence — after stage 3's reply the conversation is marked complete
// and the input is replaced with a CTA into the profile, so there's a
// defined endpoint instead of unlimited free chat.
const TOTAL_QUESTION_STAGES = 4;

const SCRIPTED_PROMPTS = [
  'ก่อนไปต่อ ขอน้องตรงปกถามแบบ STAR สักหน่อยนะครับ — เล่าสถานการณ์ที่คุณเคยเจอปัญหางานยากๆ ให้ฟังหน่อยได้ไหมครับ? (Situation คุณเจอสถานการณ์อะไร และ Task คุณต้องทำอะไร)',
  "แล้วคุณลงมือทำอย่างไรครับ (Action) และผลลัพธ์ที่ได้เป็นอย่างไรบ้าง (Result)?",
  "เกือบเสร็จแล้วครับ! มีเครื่องมือ ซอฟต์แวร์ หรือทักษะอื่นที่คุณถนัดอีกไหมครับ อยากเก็บให้ครบก่อนสรุปโปรไฟล์",
] as const;

const COMPLETION_MESSAGE =
  "ขอบคุณมากครับ! น้องตรงปกเก็บข้อมูลครบตามที่ต้องการแล้ว พร้อมไปดู Smart Profile ของคุณได้เลยครับ";

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DecoderPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [userName, setUserName] = useState<string>("");
  // True until the candidate's name is resolved — either guessed from an
  // uploaded resume (see handleResumeUpload) or given in reply to the
  // initial greeting's name question (see handleSendMessage). While true,
  // the next chat message the candidate sends is captured as their name
  // instead of being run through skill extraction / STAR-stage logic, so
  // "what's your name" always comes before anything else, exactly once.
  const [awaitingNameReply, setAwaitingNameReply] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "skills">("chat");
  // Resume skills are replaced wholesale on each new upload (a new resume
  // supersedes the old one); chat skills accumulate across the conversation.
  // The panel shows the union of both, deduped.
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [chatSkills, setChatSkills] = useState<string[]>([]);
  const confirmedSkills = Array.from(new Set([...resumeSkills, ...chatSkills]));
  const [isChatLoading, setIsChatLoading] = useState(false);
  // Which scripted question turn we're on (0-indexed); reaching
  // TOTAL_QUESTION_STAGES marks the guided conversation as complete.
  const [questionStage, setQuestionStage] = useState(0);
  const isConversationComplete = questionStage >= TOTAL_QUESTION_STAGES;

  // /profile reads both of these — the union for the skills list itself,
  // and resumeSkills separately so it can show "Verified" (came from an
  // actual document) vs "Partial" (self-reported in chat only) the same
  // way HR's own candidate report distinguishes hard-skill confidence.
  // Without this the whole point of this chat (building a Smart Profile)
  // dead-ends once the candidate navigates away.
  useEffect(() => {
    const union = Array.from(new Set([...resumeSkills, ...chatSkills]));
    localStorage.setItem("ktp_hard_skills", JSON.stringify(union));
    localStorage.setItem("ktp_resume_skills", JSON.stringify(resumeSkills));
  }, [resumeSkills, chatSkills]);

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

    // Name isn't skill/STAR content, so it's captured here before any of
    // the length/stage checks below apply to it — a short reply like "Bo"
    // is a perfectly valid name and shouldn't hit the "too short" guard
    // meant for skill/STAR answers, and this turn must not consume one of
    // the 4 bounded question stages.
    if (awaitingNameReply) {
      const name = userQuery;
      setUserName(name);
      setAwaitingNameReply(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("ktp_username", name);
      }

      // Resume-derived skills already answer "what are you good at" — no
      // point asking the candidate to repeat it, so skip straight to the
      // first STAR question when the resume already covered stage 0.
      const skipSkillStage = resumeSkills.length > 0;
      setTimeout(() => {
        const aiReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: skipSkillStage
            ? `ยินดีที่ได้รู้จักคุณ${name}นะครับ! เรซูเม่ของคุณให้ข้อมูลทักษะไว้ครบแล้ว ข้ามคำถามเรื่องทักษะไปได้เลย งั้นไปต่อกันที่คำถามถัดไปครับ\n\n${SCRIPTED_PROMPTS[0]}`
            : `ยินดีที่ได้รู้จักคุณ${name}นะครับ! ทีนี้มาเริ่มกันเลย — มีเครื่องมือ ซอฟต์แวร์ หรือทักษะอะไรที่คุณถนัดบ้างครับ?`,
          time: nowLabel(),
        };
        setMessages((prev) => [...prev, aiReply]);
        if (skipSkillStage) setQuestionStage(1);
      }, 500);
      return;
    }

    // A stray typo or an accidental Enter shouldn't burn one of the 4
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

    const greetName = `คุณ${userName}`;

    // This message's turn in the bounded flow — captured once so both the
    // Gemini path and its local-matcher fallback append the same next
    // scripted prompt (or the completion message on the final turn)
    // regardless of which one ends up serving the reply.
    const currentStage = questionStage;
    const isFinalStage = currentStage === TOTAL_QUESTION_STAGES - 1;
    const stageSuffix = isFinalStage
      ? `\n\n${COMPLETION_MESSAGE}`
      : `\n\n${SCRIPTED_PROMPTS[currentStage]}`;
    setQuestionStage(currentStage + 1);

    const replyWithLocalMatcher = () => {
      const matchedSkills = matchSkills(userQuery, [
        ...onetSkills.hardSkills,
        ...onetSkills.softSkills,
      ]);

      if (matchedSkills.length) {
        setChatSkills((prev) => Array.from(new Set([...prev, ...matchedSkills])));
      }

      const baseText = matchedSkills.length
        ? `เยี่ยมมากครับ${greetName}! จากประสบการณ์ที่คุณเล่าเรื่อง "${userQuery.slice(0, 25)}..." ระบบสกัดและเพิ่มทักษะที่เกี่ยวข้อง ${matchedSkills.length} รายการให้อัตโนมัติแล้ว`
        : `ขอบคุณครับ${greetName}! ยังไม่พบคำที่ตรงกับฐานข้อมูลทักษะจากข้อความนี้ครับ`;

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `${baseText}${stageSuffix}`,
        time: nowLabel(),
        ...(matchedSkills.length ? { extractedSkills: matchedSkills } : {}),
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

      if (skills.length) {
        setChatSkills((prev) => Array.from(new Set([...prev, ...skills])));
      }

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

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file) return;

    setUploadedFile(file.name);
    setIsParsingResume(true);

    try {
      const text = await extractTextFromPdf(file);
      if (text.trim().length < 20) {
        throw new Error("PDF has no extractable text layer");
      }

      const matchedSkills = matchSkills(text, onetSkills.hardSkills);
      // A new resume replaces the previous resume's skills (not a union) —
      // an old file's stale skills shouldn't linger once it's been swapped
      // out. Chat-derived skills are untouched.
      setResumeSkills(matchedSkills);

      // Try to resolve the name from the resume text (simple heuristic —
      // see guessNameFromResumeText, no Gemini call here). Only guess once;
      // a later resume swap shouldn't override a name the candidate may
      // have since typed themselves in chat.
      const guessedName = awaitingNameReply ? guessNameFromResumeText(text) : null;
      if (guessedName) {
        setUserName(guessedName);
        setAwaitingNameReply(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("ktp_username", guessedName);
        }
      }

      const nameLine = guessedName ? `ยินดีที่ได้รู้จักคุณ${guessedName}นะครับ! ` : "";
      // Name is resolved either just now (guessedName) or from earlier in
      // chat (awaitingNameReply was already false before this upload) —
      // "!awaitingNameReply" alone would miss the just-now case, since
      // that state update hasn't committed yet within this same handler.
      const nameNowResolved = Boolean(guessedName) || !awaitingNameReply;
      // Skill was just answered by the resume itself — skip stage 0's
      // "what are you good at" question and jump straight to STAR, but
      // only once the name question is also resolved.
      const skipSkillStage = matchedSkills.length > 0 && nameNowResolved;
      const starSuffix = skipSkillStage
        ? ` ข้ามคำถามเรื่องทักษะไปได้เลย งั้นไปต่อกันที่คำถามถัดไปครับ\n\n${SCRIPTED_PROMPTS[0]}`
        : "";
      // Still unresolved after this upload (no name on the resume, and it
      // wasn't already answered in chat) — remind before moving on, same
      // as the very first message, so name always comes before anything
      // else rather than being silently skipped.
      const nameAskSuffix =
        awaitingNameReply && !guessedName ? "\n\nก่อนไปต่อ รบกวนขอทราบชื่อผู้สมัครด้วยนะครับ" : "";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: matchedSkills.length
            ? `${nameLine}น้องตรงปกวิเคราะห์ไฟล์ PDF "${file.name}" เรียบร้อยแล้ว! พบและเพิ่มทักษะที่เกี่ยวข้อง ${matchedSkills.length} รายการให้อัตโนมัติแล้วครับ${starSuffix}${nameAskSuffix}`
            : `${nameLine}น้องตรงปกอ่านไฟล์ PDF "${file.name}" ได้แล้วครับ แต่ยังไม่พบคำที่ตรงกับฐานข้อมูลทักษะ ลองพิมพ์เล่าประสบการณ์เพิ่มเติมในแชทได้เลยครับ${nameAskSuffix}`,
          time: nowLabel(),
          ...(matchedSkills.length ? { extractedSkills: matchedSkills } : {}),
        },
      ]);
      if (skipSkillStage) setQuestionStage(1);
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
      inputEl.value = "";
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
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-[#5C5C5C]">
                <span className="h-2 w-2 rounded-full bg-[#4D7CFF]" />
                วิเคราะห์และดึงประสิทธิภาพโดยน้องตรงปก
              </div>
              <h1 className="text-[clamp(18px,4vw,28px)] font-extrabold tracking-[-0.02em]">
                ห้องสนทนากับน้องตรงปก
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#8A8A8A]">
                แนบไฟล์เรซูเม่ PDF หรือพิมพ์ชื่อเครื่องมือ/ทักษะที่ถนัด (เช่น Python, Excel, Adobe Photoshop, Critical Thinking) ให้น้องตรงปกช่วยสกัดทักษะวิชาชีพ
              </p>
            </div>

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
                <div className="flex min-h-[300px] max-h-[380px] sm:min-h-[340px] sm:max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
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
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-end gap-2">
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
                    </div>
                  )}
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
                      {awaitingNameReply
                        ? "ขั้นตอนแนะนำตัว"
                        : `คำถามที่ ${questionStage + 1} / ${TOTAL_QUESTION_STAGES}`}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={awaitingNameReply ? "พิมพ์ชื่อของคุณ..." : "พิมพ์ชื่อเครื่องมือ/ทักษะ เช่น Python, Excel..."}
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
                    {confirmedSkills.map((sk) => (
                      <div
                        key={sk}
                        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F0F0F]"
                      >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#3BF55C]" />
                        <span className="truncate">{sk}</span>
                      </div>
                    ))}
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
