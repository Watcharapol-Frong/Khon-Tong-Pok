"use client";

import { useState } from "react";
import Link from "next/link";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { extractTextFromPdf } from "@/lib/pdf";
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
    text: "สวัสดีครับ! ผมคือ น้องตรงปก 🤖 ก่อนที่เราจะเริ่มวิเคราะห์ประสบการณ์กัน ขออนุญาตสอบถามชื่อ หรือชื่อเล่น สำหรับให้ผมเรียกคุณตลอดการประเมินหน่อยครับ?",
    time: "10:30 น.",
  },
];

export default function DecoderPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [userName, setUserName] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [chatAttachment, setChatAttachment] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "skills">("chat");
  // Resume skills are replaced wholesale on each new upload (a new resume
  // supersedes the old one); chat skills accumulate across the conversation.
  // The panel shows the union of both, deduped.
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [chatSkills, setChatSkills] = useState<string[]>([]);
  const confirmedSkills = Array.from(new Set([...resumeSkills, ...chatSkills]));
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isChatLoading) return;
    if (!inputText.trim() && !chatAttachment) return;

    const messageContent = chatAttachment
      ? `${inputText} (📎 แนบไฟล์: ${chatAttachment})`.trim()
      : inputText;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: messageContent,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const userQuery = inputText || chatAttachment || "";
    setInputText("");
    setChatAttachment(null);

    // If user has not provided their name yet (first message)
    if (!userName) {
      const extractedName = userQuery.replace(/^(ผมชื่อ|ดิฉันชื่อ|ชื่อ|เรียกผมว่า|เรียกฉันว่า)/i, "").trim();
      const candidateName = extractedName || userQuery;

      // Reject obvious non-names (greetings/thanks/etc.) so the bot doesn't
      // address the user as "คุณ ขอบคุณค่ะ" when they answer with those
      // instead of an actual name — ask again rather than accept anything.
      const isPlausibleName =
        candidateName.length > 0 &&
        candidateName.length <= 20 &&
        !/^(ขอบคุณ|สวัสดี|โอเค|ok|hi|hello|ไม่รู้|ไม่มี|เฉยๆ)/i.test(candidateName);

      if (!isPlausibleName) {
        setTimeout(() => {
          const aiReply: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: `ขอโทษครับ ผมยังไม่แน่ใจว่านี่คือชื่อที่จะเรียกคุณไหม รบกวนพิมพ์แค่ชื่อหรือชื่อเล่นสั้นๆ อีกครั้งได้ไหมครับ?`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, aiReply]);
        }, 700);
        return;
      }

      setUserName(candidateName);
      if (typeof window !== "undefined") {
        localStorage.setItem("ktp_username", candidateName);
      }

      setTimeout(() => {
        const aiReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `ยินดีที่ได้รู้จักครับคุณ ${candidateName}! 🤝 สามารถแนบไฟล์เรซูเม่ PDF ด้านบน หรือพิมพ์บอกชื่อเครื่องมือ/ซอฟต์แวร์/ทักษะที่คุณถนัดตรงๆ ให้ผมช่วยสกัดทักษะวิชาชีพได้เลยครับ (ระบบผมจับคำเฉพาะทาง เช่น "Python", "Excel", "Critical Thinking" ได้แม่นกว่าประโยคเล่าเรื่องยาวๆ ครับ)`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiReply]);
      }, 700);
      return;
    }

    // Subsequent experience extraction messages — try Gemini first, fall back
    // to the local Aho-Corasick matcher (same one the resume scanner uses)
    // on any API failure so the chat never hangs or shows a dead end.
    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const replyWithLocalMatcher = () => {
      const matchedSkills = matchSkills(userQuery, [
        ...onetSkills.hardSkills,
        ...onetSkills.softSkills,
      ]);

      if (matchedSkills.length) {
        setChatSkills((prev) => Array.from(new Set([...prev, ...matchedSkills])));
      }

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: matchedSkills.length
          ? `เยี่ยมมากครับคุณ ${userName}! จากประสบการณ์ที่คุณเล่าเรื่อง "${userQuery.slice(0, 25)}..." ระบบสกัดและเพิ่มทักษะที่เกี่ยวข้อง ${matchedSkills.length} รายการให้อัตโนมัติแล้ว มีประสบการณ์อื่นอยากเล่าเพิ่มไหมครับ?`
          : `ขอบคุณครับคุณ ${userName}! ยังไม่พบคำที่ตรงกับฐานข้อมูลทักษะจากข้อความนี้ครับ ลองพิมพ์ชื่อเครื่องมือ/ซอฟต์แวร์/ทักษะตรงๆ แทนการเล่าเป็นเรื่องราว เช่น "Python, Excel, Critical Thinking" จะช่วยให้ผมจับได้แม่นขึ้นครับ`,
        time: now(),
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
        text: reply,
        time: now(),
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

        <div className="relative w-full max-w-[960px]">
          {/* Main Card Container with Mobile-Optimized Padding */}
          <div className="relative rounded-[24px] sm:rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-3 sm:p-[clamp(20px,4vw,36px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            <div className="absolute -top-3 -left-3 -z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#4D7CFF]" />

            {/* Header */}
            <div className="mb-4 sm:mb-6 border-b border-[rgba(15,15,15,0.08)] pb-3 sm:pb-4">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-[#5C5C5C]">
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
                className={`flex-1 rounded-lg py-2 text-center text-xs font-extrabold transition-all ${
                  activeMobileTab === "chat"
                    ? "bg-white text-[#0F0F0F] shadow-xs"
                    : "text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                💬 ห้องแชทน้องตรงปก
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("skills")}
                className={`flex-1 rounded-lg py-2 text-center text-xs font-extrabold transition-all ${
                  activeMobileTab === "skills"
                    ? "bg-white text-[#0F0F0F] shadow-xs"
                    : "text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                ✨ ทักษะที่สกัดได้ ({confirmedSkills.length})
              </button>
            </div>

            {/* UNIFIED CHATROOM INTERFACE */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-10">
              {/* Left: Chat & Upload Area */}
              <div
                className={`flex flex-col rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-2.5 sm:p-4 lg:col-span-7 ${
                  activeMobileTab === "chat" ? "block" : "hidden lg:flex"
                }`}
              >
                {/* Mobile-Optimized Compact PDF Resume Upload Box */}
                <div className="relative mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-[rgba(15,15,15,0.2)] bg-[#FAFAFA] p-2.5 sm:p-3 transition-all hover:border-[#0F0F0F] hover:bg-white">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg sm:text-xl">📄</span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[#0F0F0F]">
                        {isParsingResume
                          ? `⏳ กำลังอ่านไฟล์ "${uploadedFile}"...`
                          : uploadedFile
                            ? `✓ แนบสำเร็จ: ${uploadedFile}`
                            : "แนบไฟล์เรซูเม่ PDF (Optional)"}
                      </div>
                      <span className="hidden sm:inline text-[10px] text-[#8A8A8A]">
                        ลากวาง หรือ คลิกอัปโหลด (รองรับ PDF ไม่เกิน 10MB)
                      </span>
                      <span className="inline sm:hidden text-[10px] text-[#8A8A8A]">
                        คลิกเพื่อเลือกไฟล์ (PDF ≤ 10MB)
                      </span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10px] sm:text-xs font-bold text-[#0F0F0F] border border-[rgba(15,15,15,0.1)]">
                    {isParsingResume ? "กำลังประมวลผล..." : uploadedFile ? "เปลี่ยนไฟล์" : "อัปโหลด"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isParsingResume}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      const inputEl = e.target;
                      if (!file) return;

                      setUploadedFile(file.name);
                      setIsParsingResume(true);

                      const now = () =>
                        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      try {
                        const text = await extractTextFromPdf(file);
                        if (text.trim().length < 20) {
                          throw new Error("PDF has no extractable text layer");
                        }

                        const matchedSkills = matchSkills(text, onetSkills.hardSkills);

                        // A new resume replaces the previous resume's skills
                        // (not a union) — an old file's stale skills shouldn't
                        // linger once it's been swapped out. Chat-derived
                        // skills are untouched.
                        setResumeSkills(matchedSkills);

                        setMessages((prev) => [
                          ...prev,
                          {
                            id: Date.now().toString(),
                            sender: "ai",
                            text: matchedSkills.length
                              ? `น้องตรงปกวิเคราะห์ไฟล์ PDF "${file.name}" เรียบร้อยแล้ว! พบและเพิ่มทักษะที่เกี่ยวข้อง ${matchedSkills.length} รายการให้อัตโนมัติแล้วครับ`
                              : `น้องตรงปกอ่านไฟล์ PDF "${file.name}" ได้แล้วครับ แต่ยังไม่พบคำที่ตรงกับฐานข้อมูลทักษะ ลองพิมพ์เล่าประสบการณ์เพิ่มเติมในแชทได้เลยครับ`,
                            time: now(),
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
                            time: now(),
                          },
                        ]);
                      } finally {
                        setIsParsingResume(false);
                        inputEl.value = "";
                      }
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Message History Feed */}
                <div className="flex min-h-[300px] max-h-[380px] sm:min-h-[340px] sm:max-h-[420px] flex-col gap-2.5 overflow-y-auto pr-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-[#0F0F0F] text-white rounded-br-none"
                            : "bg-[#F5F5F5] text-[#0F0F0F] rounded-bl-none border border-[rgba(15,15,15,0.08)]"
                        }`}
                      >
                        {msg.text}
                        {msg.extractedSkills && (
                          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[rgba(15,15,15,0.1)] pt-2">
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
                  ))}
                  {isChatLoading && (
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-none border border-[rgba(15,15,15,0.08)] bg-[#F5F5F5] px-3.5 py-2.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A] [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A] [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Form */}
                <form onSubmit={handleSendMessage} className="mt-2.5 flex flex-col gap-1.5">
                  {chatAttachment && (
                    <div className="inline-flex items-center justify-between gap-2 self-start rounded-lg border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] px-2.5 py-1 text-[11px] font-semibold text-[#0F0F0F]">
                      <span className="truncate">📎 ไฟล์แนบ: {chatAttachment}</span>
                      <button
                        type="button"
                        onClick={() => setChatAttachment(null)}
                        className="text-[10px] text-[#8A8A8A] hover:text-red-500 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Attachment Icon Button */}
                    <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] text-base transition-all hover:bg-white hover:border-[#0F0F0F]">
                      <span>📎</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setChatAttachment(file.name);
                        }}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        title="แนบไฟล์หรือรูปภาพ"
                      />
                    </div>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="พิมพ์ชื่อเครื่องมือ/ทักษะ เช่น Python, Excel..."
                      disabled={isChatLoading}
                      className="min-w-0 flex-1 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs outline-none focus:border-[#0F0F0F] disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading}
                      className="rounded-xl bg-[#0F0F0F] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                      {isChatLoading ? "..." : "ส่ง"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right: Confirmed Skill Statements Sidebar */}
              <div
                className={`flex flex-col justify-between rounded-2xl border border-[rgba(15,15,15,0.06)] bg-[#F8F9FA] p-3 sm:p-4 lg:col-span-3 ${
                  activeMobileTab === "skills" ? "block" : "hidden lg:flex"
                }`}
              >
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#0F0F0F]">
                      ✨ ทักษะเชิงรุกที่สกัดได้
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#8A8A8A] border border-[rgba(15,15,15,0.08)]">
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
                        className="flex items-center gap-1.5 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F0F0F]"
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
