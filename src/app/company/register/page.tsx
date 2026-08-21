"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Eye, EyeOff, Mail } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Footer } from "@/components/Footer";
import { CompanyNavbar } from "@/components/CompanyNavbar";
import { checkEmailDomain, registerOrJoinCompany, setHRSession } from "@/lib/companyStore";
import type { Company } from "@/lib/types";

// "create" used to be one step with 5 fields (company name, industry, HR
// name, password, confirm password) — long enough that HR reported heavy
// scrolling on mobile. Split into createCompany/createAdmin so each screen
// only asks 2-3 questions at a time, with a dot progress indicator marking
// which of the two is active.
type Step = "email" | "join" | "createCompany" | "createAdmin";

const CREATE_STEPS: { key: Step; label: string }[] = [
  { key: "createCompany", label: "ข้อมูลบริษัท" },
  { key: "createAdmin", label: "บัญชีผู้ดูแล" },
];

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [matchedCompany, setMatchedCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [hrName, setHrName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const company = checkEmailDomain(email);
    setMatchedCompany(company);
    setStep(company ? "join" : "createCompany");
  };

  const handleBackToEmail = () => {
    setStep("email");
    setMatchedCompany(null);
    setErrorMsg("");
  };

  const handleCompanyInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMsg("กรุณากรอกชื่อบริษัท");
      return;
    }
    setErrorMsg("");
    setStep("createAdmin");
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hrName.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    setTimeout(() => {
      const result = registerOrJoinCompany({
        email: email.trim(),
        password,
        hrName: hrName.trim(),
        companyName: step === "createAdmin" ? companyName.trim() : undefined,
        industry: step === "createAdmin" ? industry.trim() : undefined,
      });
      setIsSubmitting(false);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
      setHRSession(result.hrUser.id);
      router.push("/company/dashboard");
    }, 600);
  };

  const stepIndicator = (step === "createCompany" || step === "createAdmin") && (
    <div className="mb-4 flex items-center justify-center gap-2">
      {CREATE_STEPS.map((s, i) => {
        const currentIdx = CREATE_STEPS.findIndex((cs) => cs.key === step);
        const isDone = i < currentIdx;
        const isCurrent = s.key === step;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                isCurrent
                  ? "bg-[#0F0F0F] text-white"
                  : isDone
                    ? "bg-[#4D7CFF] text-white"
                    : "bg-white text-[#8A8A8A]"
              }`}
            >
              {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={`text-[11px] font-bold ${isCurrent ? "text-[#0F0F0F]" : "text-[#8A8A8A]"}`}
            >
              {s.label}
            </span>
            {i < CREATE_STEPS.length - 1 && (
              <div className="h-px w-5 flex-shrink-0 bg-[rgba(15,15,15,0.15)]" />
            )}
          </div>
        );
      })}
    </div>
  );

  const title =
    step === "email"
      ? "ลงทะเบียนองค์กร"
      : step === "join"
        ? `เข้าร่วม ${matchedCompany?.name}`
        : step === "createCompany"
          ? "สร้างบัญชีบริษัทใหม่"
          : "สร้างบัญชีผู้ดูแลระบบ";

  const subtitle =
    step === "email"
      ? "กรอกอีเมลบริษัทเพื่อเริ่มต้น"
      : step === "join"
        ? "ระบบพบว่าโดเมนอีเมลนี้ลงทะเบียนไว้แล้ว เข้าร่วมทีมเดิมได้เลย"
        : step === "createCompany"
          ? "โดเมนอีเมลนี้ยังไม่เคยลงทะเบียน สร้างบัญชีบริษัทใหม่ได้เลย"
          : "อีกนิดเดียว — ตั้งชื่อและรหัสผ่านสำหรับบัญชีผู้ดูแล";

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <CompanyNavbar />

      <AuthCard
        isEntryStep={step === "email"}
        stepIndicator={stepIndicator}
        title={title}
        subtitle={subtitle}
        trustMessage="ข้อมูลผู้สมัครถูกปกป้องด้วยระบบ Blind Review"
      >
        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                อีเมลบริษัท <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hr@company.com"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
              />
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              เริ่มต้นใช้งาน →
            </button>

            <div className="text-center text-xs text-[#5C5C5C]">
              มีบัญชีองค์กรอยู่แล้ว?{" "}
              <Link
                href="/company/login"
                className="font-extrabold text-[#0F0F0F] underline hover:opacity-80"
              >
                เข้าสู่ระบบที่นี่
              </Link>
            </div>
          </form>
        ) : step === "createCompany" ? (
          <form onSubmit={handleCompanyInfoSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#5C5C5C]">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
              <span>{email}</span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                ชื่อบริษัท <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="เช่น TechCorp Global"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                อุตสาหกรรม (ถ้ามี)
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="เช่น Software, Fintech, Design Agency"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackToEmail}
                className="cursor-pointer rounded-full bg-white px-5 py-3.5 text-xs font-bold text-[#5C5C5C] transition-colors hover:bg-[#F0F0F0]"
              >
                ← ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex flex-1 cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
              >
                ถัดไป →
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#5C5C5C]">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
              <span>{email}</span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                ชื่อ-นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white py-3 pr-10 pl-4 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#8A8A8A] hover:text-[#0F0F0F]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={step === "createAdmin" ? () => setStep("createCompany") : handleBackToEmail}
                className="cursor-pointer rounded-full bg-white px-5 py-3.5 text-xs font-bold text-[#5C5C5C] transition-colors hover:bg-[#F0F0F0]"
              >
                ← ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting
                  ? "กำลังสร้างบัญชี..."
                  : step === "join"
                    ? `เข้าร่วม ${matchedCompany?.name}`
                    : "สร้างบัญชีบริษัทใหม่"}
              </button>
            </div>
          </form>
        )}
      </AuthCard>

      <Footer />
    </div>
  );
}
