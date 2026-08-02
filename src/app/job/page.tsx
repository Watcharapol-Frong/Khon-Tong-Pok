"use client";

import { Footer } from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { JobFilterBar } from "@/components/JobFilterBar";
import { Navbar } from "@/components/Navbar";
import { useJobFilters } from "@/hooks/useJobFilters";

export default function JobBoardPage() {
  const filters = useJobFilters();
  const { filteredJobs } = filters;

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

        <JobFilterBar filters={filters} />

        <div className="mb-[18px] flex items-center gap-2 text-xs text-[#8A8A8A]">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0F0F0F]" />
          พบ {filteredJobs.length} ตำแหน่งงานที่ตรงกับเงื่อนไข
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard key={job.title + job.company} job={job} />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="p-8 text-center text-[13px] text-[#8A8A8A]">
            ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข ลองปรับตัวกรองใหม่
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
