"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Globe } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getJobSeekerReturnState, loginJobSeeker } from "@/lib/actions/jobSeeker";
import { setJobSeekerSessionIds } from "@/lib/jobSeekerSession";

// What a returning candidate sees after login — never re-runs the
// game/onboarding step (it's optional and self-directed, not a gate), so
// this only ever distinguishes "hasn't started resume/skills yet",
// "started but hasn't finished the chatbot flow", and "fully done".
type ReturnStage = "new" | "inProgress" | "complete";

const STAGE_COPY: Record<ReturnStage, { subtitle: (name: string) => string; ctaLabel: string; ctaHref: string }> = {
  new: {
    subtitle: (name) => `ยินดีต้อนรับกลับมาครับคุณ${name}! มาเริ่มอัปโหลดเรซูเม่หรือกรอกข้อมูลทักษะกันต่อเลยครับ`,
    ctaLabel: "ไปอัปโหลดเรซูเม่ / กรอกข้อมูล →",
    ctaHref: "/decoder",
  },
  inProgress: {
    subtitle: (name) => `ยินดีต้อนรับกลับมาครับคุณ${name}! คุณทำไปถึงขั้นตอนคุยกับน้องตรงปกแล้ว มาทำต่อกันเลย`,
    ctaLabel: "ไปคุยกับน้องตรงปกต่อ →",
    ctaHref: "/decoder",
  },
  complete: {
    subtitle: (name) => `ยินดีต้อนรับกลับมาครับคุณ${name}! Smart Profile ของคุณพร้อมแล้ว`,
    ctaLabel: "ไปที่ Smart Profile →",
    ctaHref: "/profile",
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [returnStage, setReturnStage] = useState<ReturnStage>("new");
  const [candidateName, setCandidateName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);
    const result = await loginJobSeeker(email, password);

    if ("error" in result) {
      setIsSubmitting(false);
      setErrorMsg(result.error);
      return;
    }

    const { hasHardSkills, isComplete } = await getJobSeekerReturnState(result.jobSeeker.id);
    setIsSubmitting(false);

    setJobSeekerSessionIds({ jobSeekerId: result.jobSeeker.id });
    setCandidateName(result.jobSeeker.name);
    setReturnStage(isComplete ? "complete" : hasHardSkills ? "inProgress" : "new");
    setLoginSuccess(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <AuthCard
        isEntryStep={!loginSuccess}
        title={loginSuccess ? "เข้าสู่ระบบสำเร็จ!" : "เข้าสู่ระบบคนตรงปก"}
        subtitle={
          loginSuccess
            ? STAGE_COPY[returnStage].subtitle(candidateName)
            : "พิสูจน์ศักยภาพจริงด้วยตัวตนและทักษะของคุณ"
        }
        accentColor="#3BF55C"
        trustMessage="ตัวตนของคุณถูกปกป้องด้วยระบบ Blind Review จนกว่าจะถึงรอบสัมภาษณ์"
      >
        {loginSuccess ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={STAGE_COPY[returnStage].ctaHref}
                className="rounded-full bg-[#0F0F0F] px-6 py-2.5 text-xs font-bold text-white"
              >
                {STAGE_COPY[returnStage].ctaLabel}
              </Link>
              <button
                type="button"
                onClick={() => setLoginSuccess(false)}
                className="cursor-pointer rounded-full bg-[#F0F0F0] px-4 py-2.5 text-xs font-bold text-[#5C5C5C] transition-colors hover:bg-[#E5E5E5]"
              >
                ลองอีกครั้ง
              </button>
            </div>
            {/* Smart Profile is done, but never locked — the candidate can
                still re-upload a resume or keep chatting with the
                chatbot to add more, so this isn't a dead end. */}
            {returnStage === "complete" && (
              <Link
                href="/decoder"
                className="text-[11px] font-bold text-[#5C5C5C] underline hover:text-[#0F0F0F]"
              >
                แก้ไขข้อมูล / คุยกับน้องตรงปกเพิ่มเติม
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                อีเมล
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F0F0F]">รหัสผ่าน</label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("ระบบส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณเรียบร้อยแล้ว");
                  }}
                  className="text-[11px] font-bold text-[#5C5C5C] hover:text-[#0F0F0F]"
                >
                  ลืมรหัสผ่าน?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white py-3 pr-10 pl-4 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
                >
                  {showPassword ? "ซ่อน" : "แสดง"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded accent-[#0F0F0F]"
              />
              <label htmlFor="remember" className="cursor-pointer text-xs text-[#5C5C5C]">
                จดจำฉันไว้ในระบบ
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบผู้สมัคร"}
            </button>

            <div className="my-1 flex items-center gap-3">
              <div className="h-px flex-1 bg-[rgba(15,15,15,0.08)]" />
              <span className="text-[11px] font-bold text-[#8A8A8A]">หรือเข้าสู่ระบบด้วย</span>
              <div className="h-px flex-1 bg-[rgba(15,15,15,0.08)]" />
            </div>

            <button
              type="button"
              onClick={() => {
                setEmail("demo.user@gmail.com");
                setPassword("password123");
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
            >
              <Globe className="h-3.5 w-3.5" strokeWidth={2} /> เข้าสู่ระบบด้วย Google
            </button>

            <div className="mt-4 text-center text-xs text-[#5C5C5C]">
              ยังไม่มีบัญชีสมาชิก?{" "}
              <Link href="/register" className="font-extrabold text-[#0F0F0F] underline hover:opacity-80">
                สมัครเลย (เล่นมินิเกมฟรี)
              </Link>
            </div>

            <div className="text-center text-xs text-[#5C5C5C]">
              สำหรับองค์กร / HR?{" "}
              <Link
                href="/company/login"
                className="font-extrabold text-[#0F0F0F] underline hover:opacity-80"
              >
                เข้าสู่ระบบที่นี่
              </Link>
            </div>
          </form>
        )}
      </AuthCard>

      <Footer />
    </div>
  );
}
