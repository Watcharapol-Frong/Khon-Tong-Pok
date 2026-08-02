"use client";

import { useMemo, useState } from "react";
import { Footer } from "@/components/Footer";
import { JobCardWide } from "@/components/JobCardWide";
import { JobFilterSidebar } from "@/components/JobFilterSidebar";
import { Navbar } from "@/components/Navbar";
import { useJobFilters } from "@/hooks/useJobFilters";

const SORT_OPTIONS = [
  { value: "relevance", label: "ตำแหน่งงานล่าสุด" },
  { value: "salary-desc", label: "เงินเดือนสูง-ต่ำ" },
  { value: "salary-asc", label: "เงินเดือนต่ำ-สูง" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export default function JobBoardPage() {
  const filters = useJobFilters();
  const { filteredJobs } = filters;
  const [sort, setSort] = useState<SortValue>("relevance");

  const sortedJobs = useMemo(() => {
    if (sort === "salary-desc") return [...filteredJobs].sort((a, b) => b.salaryMax - a.salaryMax);
    if (sort === "salary-asc") return [...filteredJobs].sort((a, b) => a.salaryMin - b.salaryMin);
    return filteredJobs;
  }, [filteredJobs, sort]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,56px)] pb-[clamp(56px,8vw,88px)]">
        <div className="mb-6">
          <div className="mb-[6px] text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
            JOB BOARD
          </div>
          <h1 className="m-0 text-[clamp(24px,3.4vw,36px)] font-extrabold tracking-[-0.02em]">
            ตำแหน่งงานทั้งหมด
          </h1>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full flex-shrink-0 lg:sticky lg:top-[110px] lg:w-[30%]">
            <JobFilterSidebar filters={filters} />
          </aside>

          <div className="min-w-0 w-full lg:w-[70%]">
            <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#8A8A8A]">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0F0F0F]" />
                พบ {filteredJobs.length} ตำแหน่งงานที่ตรงกับเงื่อนไข
              </div>

              <label className="flex items-center gap-2 text-xs text-[#5C5C5C]">
                เรียงตาม
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortValue)}
                  className="rounded-[10px] border border-[rgba(15,15,15,0.15)] bg-white px-3 py-[7px] font-sans text-xs font-bold text-[#0F0F0F]"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-4">
              {sortedJobs.map((job) => (
                <JobCardWide key={job.title + job.company} job={job} />
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="p-8 text-center text-[13px] text-[#8A8A8A]">
                ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข ลองปรับตัวกรองใหม่
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
