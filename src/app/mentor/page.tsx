"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Lock, Send, Sparkle, User } from "lucide-react";
import { AssessmentStepBar, MENTOR_USED_KEY } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { JobSeekerAuthGuard } from "@/components/JobSeekerAuthGuard";
import { Navbar } from "@/components/Navbar";
import { getJobSeekerProfile } from "@/lib/actions/jobSeeker";
import { useJobSeekerSession } from "@/lib/jobSeekerSessionContext";

type ChatMessage = { id: string; sender: "ai" | "user"; text: string; time: string };

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MentorPage() {
  return (
    <JobSeekerAuthGuard>
      <MentorContent />
    </JobSeekerAuthGuard>
  );
}

function MentorContent() {
  const { jobSeeker } = useJobSeekerSession();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "greeting",
      sender: "ai",
      text: `สวัสดีครับคุณ${jobSeeker.name} ผมน้องตรงปกในบทบาทเมนเทอร์ครับ อยากคุยเรื่องอะไรก่อนดี — เตรียมตัวสัมภาษณ์ ปรับเรซูเม่ หรือวางแผนเส้นทางอาชีพครับ?`,
      time: nowLabel(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  // Real profile fields (not fabricated) folded into the Gemini prompt so
  // advice is grounded in this candidate's actual desired role/skills —
  // same "no data, no claim" rule generateAIResume follows.
  const [candidateContext, setCandidateContext] = useState("");
  // "คุยกับคนจริง" isn't built yet (no human-mentor accounts, scheduling,
  // or payment exist in this app) — same "Premium badge, not a real gate"
  // convention as the AI-resume button on /profile. Clicking it just shows
  // this note instead of switching away from the working AI chat below.
  const [showHumanNotice, setShowHumanNotice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getJobSeekerProfile(jobSeeker.id).then((profile) => {
      if (!profile) return;
      const lines: string[] = [];
      if (profile.desiredPosition) lines.push(`ตำแหน่งงานที่สนใจ: ${profile.desiredPosition}`);
      if (profile.computerSkills.length > 0) lines.push(`ทักษะ: ${profile.computerSkills.join(", ")}`);
      if (profile.workExperience.length > 0) {
        const latest = profile.workExperience[0];
        lines.push(`ประสบการณ์ล่าสุด: ${latest.jobTitle} ที่ ${latest.companyName}`);
      }
      setCandidateContext(lines.join("\n"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobSeeker.id stable for this page's lifetime
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSending || !inputText.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: "user", text: inputText.trim(), time: nowLabel() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText("");
    setIsSending(true);
    // "Used" the moment they actually send something, regardless of
    // whether the Gemini call below succeeds — AssessmentStepBar's
    // "คุยกับเมนเทอร์" done-check reads this same key.
    localStorage.setItem(MENTOR_USED_KEY, "true");

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ sender: m.sender, text: m.text })),
          candidateContext,
        }),
      });
      if (!res.ok) throw new Error(`/api/mentor returned ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(`/api/mentor unavailable: ${data.error ?? "unknown reason"}`);
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("/api/mentor returned an empty reply");
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "ai", text: reply, time: nowLabel() }]);
    } catch (err) {
      console.error("Mentor chat failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "ขออภัยครับ ตอนนี้น้องตรงปกไม่สามารถตอบได้ ลองอีกครั้งในอีกสักครู่นะครับ",
          time: nowLabel(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      {/* currentStep=4 while here (same as Smart Profile) — this page is
          always reached from later in the flow, and the mentor node's own
          active/done state is computed independently of this prop (see
          AssessmentStepBar). */}
      <AssessmentStepBar currentStep={4} />
      <div className="mx-auto w-full max-w-[720px] flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          กลับ Smart Profile
        </Link>

        <div className="mt-4 mb-6 flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[#F5F5F5]">
            <Image
              src="/mascot/chatbot-avatar.png"
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold">คุยกับเมนเทอร์</h1>
            <p className="text-xs text-[#8A8A8A]">น้องตรงปก ให้คำแนะนำด้านอาชีพแบบเจาะจงกับโปรไฟล์คุณ</p>
          </div>
        </div>

        {/* Free (AI, working now) vs. Premium (real human mentor, not
            built yet) — the AI tile is always the active one; the human
            tile just surfaces showHumanNotice below instead of doing
            anything real. */}
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#0F0F0F] bg-white p-3.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(59,245,92,0.15)]">
              <Sparkle className="h-3.5 w-3.5 text-[#0f5c22]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-[#0F0F0F]">คุยกับ AI</div>
              <div className="text-[10px] text-[#8A8A8A]">ฟรี · ใช้ได้ตอนนี้</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHumanNotice(true)}
            className="flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-dashed border-[rgba(15,15,15,0.15)] bg-white p-3.5 text-left transition-colors hover:border-[rgba(15,15,15,0.3)]"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F5F5]">
              <User className="h-3.5 w-3.5 text-[#8A8A8A]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F0F0F]">
                คุยกับคนจริง
                <span className="rounded-full bg-[#0F0F0F] px-1.5 py-0.5 text-[9px] font-bold text-white">Premium</span>
              </div>
              <div className="text-[10px] text-[#8A8A8A]">เสียค่าใช้จ่าย · เร็วๆ นี้</div>
            </div>
            <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[#B5B5B5]" strokeWidth={2} />
          </button>
        </div>

        {showHumanNotice && (
          <div className="mb-4 rounded-xl bg-[rgba(15,15,15,0.05)] px-3.5 py-2.5 text-[11px] text-[#5C5C5C]">
            ฟีเจอร์คุยกับเมนเทอร์ตัวจริงกำลังจะมาเร็วๆ นี้ครับ ระหว่างนี้ให้น้องตรงปก (AI) ช่วยไปก่อนได้เลยครับ
          </div>
        )}

        <div className="flex min-h-[420px] flex-col gap-3 rounded-2xl bg-[#FAFAFA] p-4">
          <div className="flex max-h-[500px] flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`flex items-end gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.sender === "ai" && (
                  <div className="mb-4 h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-white">
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
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "rounded-br-none bg-[#0F0F0F] text-white"
                        : "rounded-bl-none bg-white text-[#0F0F0F]"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="mt-1 text-[9px] text-[#8A8A8A]">{msg.time}</span>
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-end gap-2"
                >
                  <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-white">
                    <Image
                      src="/mascot/chatbot-avatar.png"
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-none bg-white px-3.5 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A] [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A] [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ถามน้องตรงปกได้เลยครับ..."
              disabled={isSending}
              className="min-w-0 flex-1 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#0F0F0F] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0F0F0F] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
