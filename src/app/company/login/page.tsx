"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Footer } from "@/components/Footer";
import { CompanyNavbar } from "@/components/CompanyNavbar";
import { loginHR, setHRSession } from "@/lib/companyStore";

export default function CompanyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    setTimeout(() => {
      const result = loginHR(email, password);
      setIsSubmitting(false);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
      setHRSession(result.id);
      router.push("/company/dashboard");
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <CompanyNavbar />

      <AuthCard
        isEntryStep
        title="เข้าสู่ระบบองค์กร"
        subtitle="จัดการตำแหน่งงานและดู Candidate ที่แมตช์"
        trustMessage="ข้อมูลผู้สมัครถูกปกป้องด้วยระบบ Blind Review"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">อีเมลบริษัท</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.com"
              className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">รหัสผ่าน</label>
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
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#8A8A8A] hover:text-[#0F0F0F]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบองค์กร"}
          </button>

          <div className="text-center text-xs text-[#5C5C5C]">
            ยังไม่มีบัญชีองค์กร?{" "}
            <Link
              href="/company/register"
              className="font-extrabold text-[#0F0F0F] underline hover:opacity-80"
            >
              ลงทะเบียนองค์กร
            </Link>
          </div>
        </form>
      </AuthCard>

      <Footer />
    </div>
  );
}
