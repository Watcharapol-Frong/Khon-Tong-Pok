"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
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
      <Navbar />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:px-8">
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
          <div className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,5vw,40px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            <div className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl bg-[#4D7CFF]" />

            <div className="mb-6 text-center">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3.5 py-1 text-xs font-bold text-[#5C5C5C]">
                <span className="h-2 w-2 rounded-full bg-[#4D7CFF]" />
                สำหรับองค์กร / HR
              </div>
              <h1 className="text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.03em]">
                เข้าสู่ระบบองค์กร
              </h1>
              <p className="mt-1.5 text-xs text-[#8A8A8A]">
                จัดการตำแหน่งงานและดู Candidate ที่แมตช์
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                  อีเมลบริษัท
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

              <div className="mt-4 text-center text-xs text-[#5C5C5C]">
                ยังไม่มีบัญชีองค์กร?{" "}
                <Link
                  href="/company/register"
                  className="font-extrabold text-[#0F0F0F] underline hover:opacity-80"
                >
                  ลงทะเบียนองค์กร
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
