"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, FileText, Lightbulb, Sparkle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import { SkillIcon } from "@/components/SkillIcon";
import { getDemoCandidateSnapshot } from "@/lib/actions/jobSeeker";

type Snapshot = Awaited<ReturnType<typeof getDemoCandidateSnapshot>>;

/**
 * Public, read-only preview of a finished Smart Profile — always the same
 * fixed reference candidate (see getDemoCandidateSnapshot), never a real
 * user's data. No login, no session, nothing here can be edited — the
 * point is letting a visitor see what they'd get before committing to
 * /register, not a working account they can act through.
 */
export default function DemoPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDemoCandidateSnapshot().then((data) => {
      setSnapshot(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="mx-auto w-full max-w-[900px] flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[rgba(77,124,255,0.08)] p-3.5 text-xs text-[#4D7CFF]">
          <Sparkle className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
          <span className="font-bold">นี่คือตัวอย่าง</span> Smart Profile ของผู้สมัครสมมติ — ไม่ใช่ข้อมูลจริงของใคร ดูตัวอย่างก่อนสมัครสมาชิกได้เลย
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-sm text-[#8A8A8A]">กำลังโหลด...</p>
        ) : !snapshot ? (
          <p className="py-16 text-center text-sm text-[#8A8A8A]">ยังไม่มีตัวอย่างให้ดูตอนนี้ครับ</p>
        ) : (
          <>
            <div className="mb-6 rounded-[24px] bg-[#F5F5F5] p-5 sm:p-7">
              <div className="mb-1 text-[11px] font-bold tracking-wider text-[#8A8A8A] uppercase">ตัวอย่าง Smart Profile</div>
              <h1 className="text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">{snapshot.name}</h1>
              {snapshot.desiredPosition && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#5C5C5C]">
                  <Briefcase className="h-3.5 w-3.5" strokeWidth={2} />
                  สนใจตำแหน่ง {snapshot.desiredPosition}
                </p>
              )}
            </div>

            {snapshot.axisScores.length > 0 && (
              <div className="mb-6 rounded-[24px] bg-[#F5F5F5] p-5 sm:p-7">
                <h2 className="mb-4 text-sm font-extrabold">Soft Skills จากมินิเกม</h2>
                <div className="flex flex-col items-center gap-5 lg:flex-row">
                  <div className="flex w-full max-w-[280px] flex-shrink-0 justify-center">
                    <RadarChart
                      data={snapshot.axisScores.map((a) => ({ axis: a.th, value: a.value }))}
                      size={260}
                      theme="mono"
                      showLabels
                      animate
                    />
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                    {snapshot.axisScores.map((a) => (
                      <div key={a.key} className="rounded-xl bg-white p-2.5 text-center">
                        <div className="text-sm font-extrabold">{a.value}%</div>
                        <div className="text-[9px] leading-snug text-[#8A8A8A]">{a.th}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {snapshot.computerSkills.length > 0 && (
              <div className="mb-6 rounded-[24px] bg-[#F5F5F5] p-5 sm:p-7">
                <h2 className="mb-3 text-sm font-extrabold">Hard Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {snapshot.computerSkills.map((skill) => (
                    <div key={skill} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold">
                      <SkillIcon skill={skill} size={14} />
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {snapshot.aiSummaryText && (
              <div className="mb-6 rounded-[24px] bg-[rgba(77,124,255,0.06)] p-5 sm:p-7">
                <h2 className="mb-2 text-sm font-extrabold">AI Summary — วิเคราะห์โดยน้องตรงปก</h2>
                <p className="text-xs leading-relaxed text-[#0F0F0F]">{snapshot.aiSummaryText}</p>
              </div>
            )}

            {snapshot.gapAnalysis && (
              <div className="mb-6 rounded-[24px] bg-[#F5F5F5] p-5 sm:p-7">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-extrabold">
                  <Lightbulb className="h-4 w-4 text-[#4D7CFF]" strokeWidth={2} />
                  น้องตรงปกวิเคราะห์เชิงลึก
                </h2>
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs font-bold text-[#d63d28]">{snapshot.gapAnalysis.missingTitle}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A4A4A]">{snapshot.gapAnalysis.missingDetail}</p>
                </div>
              </div>
            )}

            <div className="rounded-[28px] bg-[#0F0F0F] p-7 text-center text-white sm:p-10">
              <FileText className="mx-auto mb-3 h-8 w-8" strokeWidth={1.75} />
              <h2 className="mb-2 text-lg font-extrabold sm:text-xl">อยากได้ Smart Profile แบบนี้เป็นของตัวเอง?</h2>
              <p className="mx-auto mb-5 max-w-[440px] text-xs leading-relaxed text-white/70">
                สมัครสมาชิกฟรี เล่นมินิเกม อัปโหลดเรซูเม่ ให้น้องตรงปกช่วยวิเคราะห์ทักษะของคุณจริงๆ
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-xs font-extrabold text-[#0F0F0F] transition-opacity hover:opacity-90"
              >
                สมัครสมาชิกฟรี →
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
