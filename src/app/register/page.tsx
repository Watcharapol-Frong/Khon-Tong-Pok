"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function RegisterCandidatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    consentPDPA: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // OTP 6 digits state
  const [otp, setOtp] = useState<string[]>(["8", "4", "9", "2", "0", "1"]);
  const [resendTimer, setResendTimer] = useState(59);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Resend Countdown
  useEffect(() => {
    if (currentStep === 2 && resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, resendTimer]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg("");
  };

  // OTP digit input handler
  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    if (!cleanValue && value !== "") return;

    const newOtp = [...otp];

    // Support paste 6 digits
    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedDigits[i] || "";
      }
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      return;
    }

    newOtp[index] = cleanValue;
    setOtp(newOtp);
    setErrorMsg("");

    // Auto-focus next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 1: Submit Form -> Go to Step 2 (OTP Verification)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (!formData.consentPDPA) {
      setErrorMsg("กรุณากดยินยอมให้นำเสนอข้อมูลตามนโยบายความเป็นส่วนตัว");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentStep(2);
      setResendTimer(59);
    }, 600);
  };

  // Step 2: Verify OTP -> Immediately navigate to /onboarding
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join("");
    if (fullCode.length < 6) {
      setErrorMsg("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/onboarding");
    }, 600);
  };

  const handleResendOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setResendTimer(59);
    setErrorMsg("");
    alert(`ระบบส่งรหัส OTP 6 หลักใหม่ไปยัง ${formData.email || "อีเมลของคุณ"} เรียบร้อยแล้ว`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:px-8">
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

        <div className="relative w-full max-w-[460px]">
          {/* Card Container */}
          <div className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,5vw,40px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            <div className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl bg-[#3BF55C]" />

            {/* Header & Step Indicator */}
            <div className="mb-6 text-center">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3.5 py-1 text-xs font-bold text-[#5C5C5C]">
                <span className="h-2 w-2 rounded-full bg-[#3BF55C]" />
                สำหรับผู้หางาน (Candidate)
              </div>
              <h1 className="text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.03em]">
                {currentStep === 1 ? "สมัครสมาชิกคนตรงปก" : "ยืนยันตัวตนด้วยรหัส OTP"}
              </h1>
              <p className="mt-1.5 text-xs text-[#8A8A8A]">
                {currentStep === 1
                  ? "ขั้นตอนที่ 1 จาก 2: กรอกข้อมูลสร้างบัญชี"
                  : `กรอกรหัส OTP 6 หลักที่ส่งไปยัง ${formData.email || "อีเมลของคุณ"}`}
              </p>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    currentStep >= 1 ? "bg-[#0F0F0F]" : "bg-[rgba(15,15,15,0.1)]"
                  }`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    currentStep === 2 ? "bg-[#3BF55C]" : "bg-[rgba(15,15,15,0.1)]"
                  }`}
                />
              </div>
            </div>

            {currentStep === 1 ? (
              /* STEP 1 FORM: Email + Password + PDPA */
              <form onSubmit={handleStep1Submit} className="flex flex-col gap-4">
                {/* Google Quick Signup */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        email: "somchai.dev@gmail.com",
                        password: "password123",
                        confirmPassword: "password123",
                        consentPDPA: true,
                      });
                      router.push("/onboarding");
                    }}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white py-3 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F5F5F5]"
                  >
                    <span>🌐</span> สมัครสมาชิกด่วนด้วย Google
                  </button>
                </div>

                {/* Divider */}
                <div className="my-1 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[rgba(15,15,15,0.08)]" />
                  <span className="text-[11px] font-bold text-[#8A8A8A]">หรือกรอกข้อมูลสมัคร</span>
                  <div className="h-px flex-1 bg-[rgba(15,15,15,0.08)]" />
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white py-3 pr-10 pl-4 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-bold text-[#8A8A8A]"
                    >
                      {showPassword ? "ซ่อน" : "แสดง"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
                  />
                </div>

                {/* PDPA Consent Checkbox */}
                <div className="mt-1 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="consentPDPA"
                    checked={formData.consentPDPA}
                    onChange={(e) => handleChange("consentPDPA", e.target.checked)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-[#0F0F0F]"
                  />
                  <label htmlFor="consentPDPA" className="cursor-pointer text-[11px] leading-[1.5] text-[#5C5C5C]">
                    ฉันยอมรับ{" "}
                    <a href="#terms" onClick={(e) => e.preventDefault()} className="font-bold underline text-[#0F0F0F]">
                      ข้อตกลงเงื่อนไขการใช้งาน
                    </a>{" "}
                    และยินยอมให้วิเคราะห์ทักษะจากพฤติกรรมการเล่นเกมตาม{" "}
                    <a href="#pdpa" onClick={(e) => e.preventDefault()} className="font-bold underline text-[#0F0F0F]">
                      นโยบายความเป็นส่วนตัว (Blind Review)
                    </a>
                  </label>
                </div>

                {/* Submit Button: "สมัครสมาชิก" */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังส่งข้อมูลสมัคร..." : "สมัครสมาชิก"}
                </button>

                {/* Login Redirect */}
                <div className="mt-4 text-center text-xs text-[#5C5C5C]">
                  มีบัญชีผู้สมัครอยู่แล้ว?{" "}
                  <Link href="/login" className="font-extrabold text-[#0F0F0F] underline hover:opacity-80">
                    เข้าสู่ระบบที่นี่
                  </Link>
                </div>
              </form>
            ) : (
              /* STEP 2 FORM: 6-Digit Email OTP Verification */
              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
                <div className="rounded-2xl border border-[rgba(15,15,15,0.08)] bg-white p-4 text-center">
                  <div className="text-2xl">📩</div>
                  <div className="mt-1 text-xs font-bold text-[#0F0F0F]">
                    รหัสอ้างอิง OTP: <span className="font-mono text-[#4D7CFF]">#KP-8902</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8A8A8A]">
                    ระบบส่งรหัสผ่านใช้ครั้งเดียว 6 หลักไปยัง{" "}
                    <span className="font-bold text-[#0F0F0F]">{formData.email || "somchai.dev@gmail.com"}</span>
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="h-12 w-11 rounded-xl border border-[rgba(15,15,15,0.15)] bg-white text-center font-mono text-lg font-extrabold text-[#0F0F0F] outline-none transition-all focus:border-[#0F0F0F] focus:ring-2 focus:ring-[rgba(15,15,15,0.1)] sm:h-13 sm:w-12"
                    />
                  ))}
                </div>

                {/* Resend OTP Timer */}
                <div className="text-center text-xs text-[#5C5C5C]">
                  {resendTimer > 0 ? (
                    <span>
                      ส่งรหัสอีกครั้งได้ใน <span className="font-mono font-bold text-[#0F0F0F]">{resendTimer}</span> วินาที
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="cursor-pointer font-bold text-[#0F0F0F] underline hover:opacity-80"
                    >
                      🔄 ส่งรหัส OTP ใหม่อีกครั้ง
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setErrorMsg("");
                    }}
                    className="flex-1 cursor-pointer rounded-full border border-[rgba(15,15,15,0.15)] bg-white py-3.5 text-xs font-bold text-[#5C5C5C]"
                  >
                    ← แก้ไขอีเมล
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] cursor-pointer rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? "กำลังตรวจสอบ OTP..." : "ยืนยันรหัส OTP 6 หลัก"}
                  </button>
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
