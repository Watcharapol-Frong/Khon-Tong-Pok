"use client";

import { useMemo, useState } from "react";
import { Footer } from "@/components/Footer";
import { JobCardWide } from "@/components/JobCardWide";
import { JobFilterBar } from "@/components/JobFilterBar";
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

      {/* Locked at every breakpoint: pinned to the viewport height under the
          navbar so only the card list (and the sidebar, if it overflows)
          scrolls internally — the heading, filter bar, and sort row stay put. */}
      <div className="mx-auto flex h-[calc(100vh-100px)] w-full max-w-[1240px] flex-col px-[clamp(20px,4vw,48px)]">
        <div className="flex-shrink-0 pt-4 pb-3 lg:pt-6 lg:pb-4">
          <div className="mb-[6px] text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
            JOB BOARD
          </div>
          <h1 className="m-0 text-[clamp(20px,3vw,36px)] font-extrabold tracking-[-0.02em] lg:text-2xl">
            ตำแหน่งงานทั้งหมด
          </h1>
        </div>

        {/* Mobile/tablet: compact search + quick tabs + popup filter panel, same
            pattern as the homepage, to save vertical space. Desktop keeps the
            always-expanded locked sidebar. */}
        <div className="flex-shrink-0 lg:hidden">
          <JobFilterBar filters={filters} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch lg:pb-6">
          <aside className="thin-scrollbar hidden flex-shrink-0 lg:block lg:h-full lg:w-[30%] lg:overflow-y-auto lg:pr-1">
            <JobFilterSidebar filters={filters} />
          </aside>

          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col lg:h-full lg:w-[70%]">
            <div className="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 lg:mb-4">
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

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-4 pb-6">
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
      </div>

      <Footer />
    </div>
  );
}
