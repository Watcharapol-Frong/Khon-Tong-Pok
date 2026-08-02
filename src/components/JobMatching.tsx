"use client";

import { useMemo } from "react";
import Link from "next/link";
import { JobCard } from "@/components/JobCard";
import { JobFilterBar } from "@/components/JobFilterBar";
import { useJobFilters } from "@/hooks/useJobFilters";
import { JOBS } from "@/lib/data";

export function JobMatching() {
  const filters = useJobFilters();
  const { filteredJobs } = filters;

  const marqueeCompanies = useMemo(
    () => Array.from(new Set(JOBS.map((j) => j.company.split(" · ")[0]))),
    []
  );

  return (
    <div
      id="job-matching"
      className="mx-auto w-full max-w-[1240px] scroll-mt-[90px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,56px)] pb-[clamp(40px,5vw,56px)]"
    >
      <div className="mb-6">
        <div className="mb-[6px] text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          JOB MATCHING
        </div>
        <h2 className="m-0 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          ตำแหน่งงานและ Soft Skill ที่องค์กรมองหา
        </h2>
      </div>

      <JobFilterBar filters={filters} />

      <div className="mb-[18px] flex items-center gap-2 text-xs text-[#8A8A8A]">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0F0F0F]" />
        เล่นเกมประเมินทักษะ 10 นาที เพื่อปลดล็อก % Match ส่วนบุคคลกับทุกตำแหน่งงาน
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollSnapType: "x proximity" }}>
        <div
          className="grid flex-shrink-0 gap-4"
          style={{
            gridAutoFlow: "column",
            gridTemplateRows: "repeat(2, auto)",
            gridAutoColumns: "min(320px, 80vw)",
          }}
        >
          {filteredJobs.map((job) => (
            <div key={job.title + job.company} style={{ scrollSnapAlign: "start" }}>
              <JobCard job={job} />
            </div>
          ))}
        </div>

        {filteredJobs.length > 0 && (
          <Link
            href="/job"
            style={{ scrollSnapAlign: "start" }}
            className="flex w-[120px] flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[rgba(15,15,15,0.2)] bg-[#FAFAFA] p-3 text-center transition-colors hover:border-[rgba(15,15,15,0.4)]"
          >
            <span className="text-lg">→</span>
            <span className="text-xs font-extrabold">ดูงานทั้งหมด</span>
          </Link>
        )}
      </div>

      {filteredJobs.length === 0 && (
        <div className="p-8 text-center text-[13px] text-[#8A8A8A]">
          ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข ลองปรับตัวกรองใหม่
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 text-center text-xs font-bold text-[#8A8A8A]">
          บริษัทที่กำลังเปิดรับตำแหน่งงานผ่านคนตรงปก
        </div>
        <div
          className="relative overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right,transparent,#000 8%,#000 92%,transparent)",
            WebkitMaskImage: "linear-gradient(to right,transparent,#000 8%,#000 92%,transparent)",
          }}
        >
          <div className="animate-marquee flex w-max">
            {[...marqueeCompanies, ...marqueeCompanies].map((co, i) => (
              <div key={i} className="flex flex-shrink-0 items-center gap-2 px-7 py-[10px]">
                <div className="h-2 w-2 flex-shrink-0 rounded-sm bg-[#0F0F0F]" />
                <span className="text-sm font-bold whitespace-nowrap text-[#5C5C5C]">{co}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
