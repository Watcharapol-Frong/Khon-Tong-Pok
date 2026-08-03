"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [isVerified, setIsVerified] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const verified = localStorage.getItem("ktp_profile_verified");
      if (verified === "true") {
        setIsVerified(true);
      }
    }
  }, []);

  const sortedJobs = useMemo(() => {
    if (sort === "salary-desc") return [...filteredJobs].sort((a, b) => b.salaryMax - a.salaryMax);
    if (sort === "salary-asc") return [...filteredJobs].sort((a, b) => a.salaryMin - b.salaryMin);
    return filteredJobs;
  }, [filteredJobs, sort]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="mx-auto flex w-full max-w-[1240px] flex-col px-[clamp(20px,4vw,48px)]">
        <div className="flex-shrink-0 pt-4 pb-3 lg:pt-6 lg:pb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-[6px] text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
              JOB BOARD
            </div>
            <h1 className="m-0 text-[clamp(20px,3vw,36px)] font-extrabold tracking-[-0.02em] lg:text-2xl">
              ตำแหน่งงานทั้งหมด
            </h1>
          </div>

          {!isVerified && (
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] px-4 py-2 text-xs font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white"
            >
              <span>เข้าทำแบบประเมินเพื่อปลดล็อก Match Rate % จริง</span>
            </Link>
          )}
        </div>

        {/* Mobile/tablet: compact search + quick tabs + popup filter panel, same
            pattern as the homepage, to save vertical space. Desktop keeps the
            always-expanded sidebar. */}
        <div className="flex-shrink-0 lg:hidden">
          <JobFilterBar filters={filters} />
        </div>

        <div className="flex flex-col gap-6 pb-10 lg:flex-row lg:items-start">
          <aside className="hidden flex-shrink-0 lg:sticky lg:top-[104px] lg:block lg:w-[30%]">
            <JobFilterSidebar filters={filters} />
          </aside>

          <div className="flex w-full min-w-0 flex-1 flex-col lg:w-[70%]">
            <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-2 lg:mb-4 lg:gap-3">
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] whitespace-nowrap text-[#8A8A8A] sm:gap-2 sm:text-xs">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0F0F0F]" />
                <span>
                  พบ {filteredJobs.length} <span className="hidden sm:inline">ตำแหน่งงานที่ตรงกับเงื่อนไข</span>
                  <span className="sm:hidden">ตำแหน่ง</span>
                </span>
              </div>

              <label className="flex flex-shrink-0 items-center gap-1.5 text-[11px] whitespace-nowrap text-[#5C5C5C] sm:gap-2 sm:text-xs">
                <span className="hidden sm:inline">เรียงตาม</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortValue)}
                  className="min-w-0 rounded-lg border border-[rgba(15,15,15,0.15)] bg-white px-2 py-[5px] font-sans text-[11px] font-bold text-[#0F0F0F] sm:rounded-[10px] sm:px-3 sm:py-[7px] sm:text-xs"
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
              {sortedJobs.map((job, idx) => (
                <JobCardWide
                  key={job.title + job.company}
                  job={job}
                  isVerified={isVerified}
                  matchRate={96 - (idx % 5) * 3}
                />
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
