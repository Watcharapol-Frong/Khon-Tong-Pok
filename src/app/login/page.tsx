"use client";

import { useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setLoginSuccess(true);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:px-8">
        {/* Decorative Grid & Glow Background */}
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

        <div className="relative w-full max-w-[460px]">
          {/* Card Container */}
          <div className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,5vw,40px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            <div className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl bg-[#3BF55C]" />

            {/* Header */}
            <div className="mb-6 text-center">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3.5 py-1 text-xs font-bold text-[#5C5C5C]">
                <span className="h-2 w-2 rounded-full bg-[#3BF55C]" />
                สำหรับผู้หางาน (Candidate)
              </div>
              <h1 className="text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.03em]">
                เข้าสู่ระบบคนตรงปก
              </h1>
              <p className="mt-1.5 text-xs text-[#8A8A8A]">
                พิสูจน์ศักยภาพจริงด้วยตัวตนและทักษะของคุณ
              </p>
            </div>

            {loginSuccess ? (
              <div className="rounded-2xl border border-[rgba(59,245,92,0.3)] bg-[rgba(59,245,92,0.1)] p-6 text-center">
                <div className="mb-2 text-3xl">🎉</div>
                <div className="text-base font-extrabold text-[#0F0F0F]">
                  เข้าสู่ระบบสำเร็จ!
                </div>
                <p className="mt-1 text-xs text-[#4A4A4A]">กำลังนำคุณไปยังหน้าประเมินมินิเกม...</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link
                    href="/game"
                    className="rounded-full bg-[#0F0F0F] px-6 py-2.5 text-xs font-bold text-white"
                  >
                    ไปหน้าต่อไป →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setLoginSuccess(false)}
                    className="rounded-full border border-[rgba(15,15,15,0.15)] bg-white px-4 py-2.5 text-xs font-bold text-[#5C5C5C]"
                  >
                    ลองอีกครั้ง
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Email / Phone Field */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                    อีเมล หรือ เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com หรือ 0812345678"
                    className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
                  />
                </div>

                {/* Password Field */}
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

                {/* Remember Me */}
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบผู้สมัคร"}
                </button>

                {/* Divider */}
                <div className="my-1 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[rgba(15,15,15,0.08)]" />
                  <span className="text-[11px] font-bold text-[#8A8A8A]">หรือเข้าสู่ระบบด้วย</span>
                  <div className="h-px flex-1 bg-[rgba(15,15,15,0.08)]" />
                </div>

                {/* Social Login */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("demo.user@gmail.com");
                      setPassword("password123");
                    }}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white py-2.5 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F5F5F5]"
                  >
                    <span>🌐</span> เข้าสู่ระบบด้วย Google
                  </button>
                </div>

                {/* Bottom Registration Link */}
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
