"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { JOBS, LEVEL_LABELS, LOCATION_LABELS, WORK_TYPE_LABELS } from "@/lib/data";

function fullSalaryLabel(job: (typeof JOBS)[number]) {
  if (job.salaryNote) return job.salaryNote;
  return `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const job = JOBS.find((j) => j.id === params.id);

  const [isVerified, setIsVerified] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("ktp_profile_verified") === "true") {
      setIsVerified(true);
    }
  }, []);

  const companyName = job?.company.split(" · ")[0] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="relative flex-1">
        {/* Same soft dot-grid backdrop as the rest of /job, ties this detail
            view back into the login/register visual language. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.04) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 70% 50% at 50% 0%,#000 30%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 0%,#000 30%,transparent 100%)",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-[860px] flex-col px-[clamp(20px,4vw,48px)] py-8">
          <Link
            href="/job"
            className="mb-5 inline-flex w-fit items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับไปหน้าตำแหน่งงานทั้งหมด
          </Link>

          {!job ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-10 text-center text-sm text-[#8A8A8A]">
              ไม่พบตำแหน่งงานนี้ อาจถูกปิดรับสมัครไปแล้ว
              <Link href="/job" className="font-bold text-[#0F0F0F] underline">
                ดูตำแหน่งงานทั้งหมด
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[#F5F5F5] p-[clamp(20px,4vw,32px)]">
                <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 text-xs font-bold text-[#8A8A8A]">{companyName}</div>
                    <h1 className="text-[clamp(22px,3.5vw,30px)] font-extrabold tracking-[-0.02em]">
                      {job.title}
                    </h1>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <div className="text-base font-extrabold whitespace-nowrap">
                      {fullSalaryLabel(job)}
                    </div>
                    {job.interviewNote && (
                      <span className="rounded-md bg-[rgba(77,124,255,0.1)] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#4D7CFF]">
                        {job.interviewNote}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-3 py-1 text-xs font-bold whitespace-nowrap text-[#5C5C5C]">
                    {LEVEL_LABELS[job.level]}
                  </span>
                  <span className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-3 py-1 text-xs font-bold whitespace-nowrap text-[#5C5C5C]">
                    {WORK_TYPE_LABELS[job.workType]}
                  </span>
                  <span className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-3 py-1 text-xs font-bold whitespace-nowrap text-[#5C5C5C]">
                    {LOCATION_LABELS[job.city]}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="mb-2.5 text-xs font-extrabold">Soft Skill ที่มองหา</div>
                  <div className="flex flex-wrap gap-2">
                    {job.skillTags.map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded-full px-3 py-1.5 text-xs font-bold"
                        style={{ background: tag.bg, color: tag.color }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2.5 text-xs font-extrabold">Hard Skill ที่ต้องมี</div>
                  <div className="flex flex-wrap gap-2">
                    {job.hardSkills.split(" · ").map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-3 py-1.5 text-xs font-bold text-[#5C5C5C]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-[#F5F5F5] p-[clamp(20px,4vw,32px)] text-center">
                <Image
                  src="/mascot/mascot-job-apply-success.png"
                  alt=""
                  width={112}
                  height={112}
                  className="h-20 w-20 object-contain"
                />
                {isVerified ? (
                  <>
                    <h2 className="text-lg font-extrabold tracking-[-0.02em]">พร้อมสมัครตำแหน่งนี้แล้ว</h2>
                    <p className="max-w-[420px] text-xs text-[#8A8A8A]">
                      โปรไฟล์ของคุณผ่านการประเมินแล้ว ยื่นใบสมัครเพื่อดู Match Rate จริงกับตำแหน่งนี้
                    </p>
                    <button
                      type="button"
                      className="mt-1 cursor-pointer rounded-full bg-[#0F0F0F] px-6 py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90"
                    >
                      สมัครตำแหน่งนี้
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-extrabold tracking-[-0.02em]">
                      อยากรู้ Match Rate ของคุณกับตำแหน่งนี้ไหม?
                    </h2>
                    <p className="max-w-[420px] text-xs text-[#8A8A8A]">
                      เล่นมินิเกมประเมินทักษะ 10 นาที ไม่ต้องมีเรซูเม่ก็เริ่มได้ เพื่อปลดล็อก % Match ส่วนบุคคลกับทุกตำแหน่งงาน
                    </p>
                    <Link
                      href="/login"
                      className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#0F0F0F] px-6 py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90"
                    >
                      เข้าทำแบบประเมินเพื่อปลดล็อก Match Rate % จริง
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
