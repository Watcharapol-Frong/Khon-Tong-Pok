"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { JobSeekerAuthGuard } from "@/components/JobSeekerAuthGuard";
import { Navbar } from "@/components/Navbar";
import { syncResumeExtraction } from "@/lib/actions/jobSeeker";
import { useJobSeekerSession } from "@/lib/jobSeekerSessionContext";
import onetSkills from "@/data/onet_skills_dictionary_full.json";

const HARD_SKILLS_BY_LOWER = new Map(onetSkills.hardSkills.map((s) => [s.toLowerCase(), s]));

function normalizeHardSkillsInput(raw: string): { valid: string[]; invalid: string[] } {
  const candidates = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const c of candidates) {
    const canonical = HARD_SKILLS_BY_LOWER.get(c.toLowerCase());
    if (canonical) valid.push(canonical);
    else invalid.push(c);
  }
  return { valid: Array.from(new Set(valid)), invalid };
}

export default function DecoderManualPage() {
  return (
    <JobSeekerAuthGuard>
      <DecoderManualContent />
    </JobSeekerAuthGuard>
  );
}

function DecoderManualContent() {
  const router = useRouter();
  const { jobSeeker } = useJobSeekerSession();
  const [skillsInput, setSkillsInput] = useState("");
  const [invalidSkillsNotice, setInvalidSkillsNotice] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { valid, invalid } = normalizeHardSkillsInput(skillsInput);
    setInvalidSkillsNotice(invalid);

    if (valid.length === 0) {
      setErrorMsg("กรุณากรอกทักษะอย่างน้อย 1 รายการ ที่ตรงกับฐานข้อมูลทักษะ");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    const result = await syncResumeExtraction(jobSeeker.id, { hardSkills: valid });
    setIsSubmitting(false);

    if ("error" in result) {
      setErrorMsg(result.error);
      return;
    }

    router.push("/decoder");
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

        <div className="relative w-full max-w-[520px]">
          <div className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,5vw,40px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            <div className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl bg-[#4D7CFF]" />

            <button
              type="button"
              onClick={() => router.push("/decoder")}
              className="mb-4 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              กลับไปหน้าแชท
            </button>

            <div className="mb-6">
              <h1 className="text-[clamp(22px,4vw,28px)] font-extrabold tracking-[-0.03em]">
                กรอกทักษะด้วยตัวเอง
              </h1>
              <p className="mt-1.5 text-xs text-[#8A8A8A]">
                ไม่มีเรซูเม่ตอนนี้? พิมพ์ทักษะที่คุณถนัดเองได้เลยครับคุณ{jobSeeker.name}
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
                  ทักษะที่คุณถนัด (คั่นด้วย , ) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="เช่น Python, Excel, Adobe Photoshop, Critical Thinking"
                  className="w-full resize-none rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-3 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]"
                />
                <p className="mt-1 text-[10px] text-[#8A8A8A]">
                  ต้องตรงกับชื่อในฐานข้อมูลทักษะ (เช่นเดียวกับที่น้องตรงปกใช้) — ระบบจะตัดคำที่ไม่ตรงออกอัตโนมัติ
                </p>
                {invalidSkillsNotice.length > 0 && (
                  <p className="mt-1 text-[10px] font-bold text-amber-600">
                    ไม่พบในฐานข้อมูล เลยถูกตัดออก: {invalidSkillsNotice.join(", ")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกและเริ่มคุยกับน้องตรงปก →"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
