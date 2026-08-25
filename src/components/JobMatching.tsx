"use client";

import { useMemo } from "react";
import Avatar from "boring-avatars";
import Link from "next/link";
import { JobCard } from "@/components/JobCard";
import { JobFilterBar } from "@/components/JobFilterBar";
import { useJobFilters } from "@/hooks/useJobFilters";
import { JOBS } from "@/lib/data";
import type { Job } from "@/lib/types";

// This row is a homepage *preview*, not the job board itself (that's
// /job, which uses the same useJobFilters hook without this cap) — as the
// real dataset grows to many companies/positions, showing "all of them"
// in a horizontally-scrolling row stops being something anyone actually
// scrolls through. Capping keeps the preview scannable regardless of how
// large the underlying data gets; "ดูตำแหน่งงานทั้งหมด" is the real
// unbounded browsing entry point.
const PREVIEW_LIMIT = 8;

// Round-robin across categories (not just the first N in array order) so
// the preview stays representative — a dataset that happens to list many
// "dev" jobs before any "marketing"/"design" ones shouldn't make the
// preview look dev-only.
function pickDiversePreview(jobs: Job[], limit: number): Job[] {
  if (jobs.length <= limit) return jobs;
  const buckets = new Map<string, Job[]>();
  for (const job of jobs) {
    const bucket = buckets.get(job.category);
    if (bucket) bucket.push(job);
    else buckets.set(job.category, [job]);
  }
  const bucketArrays = Array.from(buckets.values());
  const result: Job[] = [];
  for (let round = 0; result.length < limit; round++) {
    const before = result.length;
    for (const bucket of bucketArrays) {
      if (result.length >= limit) break;
      if (bucket[round]) result.push(bucket[round]);
    }
    if (result.length === before) break; // every bucket exhausted
  }
  return result;
}

// These are mock/placeholder companies with no real logos to show, so a
// generic building icon or plain initial reads as an obvious stand-in.
// boring-avatars (MIT, zero runtime deps, fully client-side/offline —
// deterministic SVG generated from the name string, no network calls)
// generates a distinct abstract mark per company instead, seeded with
// this site's own accent palette so they read as belonging here.
const LOGO_COLORS = ["#F5D949", "#B14DFF", "#4D7CFF", "#FF5CA8", "#3BF55C", "#FF6E5C"];

export function JobMatching() {
  const filters = useJobFilters();
  const { filteredJobs } = filters;

  const previewJobs = useMemo(
    () => pickDiversePreview(filteredJobs, PREVIEW_LIMIT),
    [filteredJobs]
  );

  const marqueeCompanies = useMemo(
    () => Array.from(new Set(JOBS.map((j) => j.company.split(" · ")[0]))),
    []
  );

  return (
    <div
      id="job-matching"
      className="mx-auto w-full max-w-[1240px] scroll-mt-[90px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,56px)] pb-[clamp(40px,5vw,56px)]"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-[6px] text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
            JOB MATCHING
          </div>
          <h2 className="m-0 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
            ตำแหน่งงานและ Soft Skill ที่องค์กรมองหา
          </h2>
        </div>
        {/* Was previously reachable only via a trailing card at the very
            end of the horizontal-scroll job row — removed that card since
            this header link is now the one way to reach it. */}
        <Link
          href="/job"
          className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 text-sm font-bold text-[#0F0F0F] transition-opacity hover:opacity-60"
        >
          ดูตำแหน่งงานทั้งหมด <span className="text-base">→</span>
        </Link>
      </div>

      <JobFilterBar filters={filters} />

      <div className="mb-[18px] flex items-center gap-2 text-xs text-[#8A8A8A]">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0F0F0F]" />
        เล่นเกมประเมินทักษะ 10 นาที เพื่อปลดล็อก % Match ส่วนบุคคลกับทุกตำแหน่งงาน
      </div>

      {previewJobs.length > 0 ? (
        <div
          className="marquee-pause-on-hover relative overflow-hidden"
          role="group"
          aria-label="ตัวอย่างตำแหน่งงาน"
          style={{
            maskImage: "linear-gradient(to right,transparent,#000 4%,#000 96%,transparent)",
            WebkitMaskImage: "linear-gradient(to right,transparent,#000 4%,#000 96%,transparent)",
          }}
        >
          <div className="animate-marquee-slow flex w-max gap-4">
            {[...previewJobs, ...previewJobs].map((job, i) => (
              <div
                key={`${job.title}-${job.company}-${i}`}
                aria-hidden={i >= previewJobs.length}
                className="w-[min(320px,80vw)] flex-shrink-0"
              >
                {/* Duplicate half exists only for the seamless loop — now
                    that JobCard is a real link, it must be removed from tab
                    order too, not just hidden from screen readers. */}
                <JobCard job={job} tabIndex={i >= previewJobs.length ? -1 : undefined} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-[13px] text-[#8A8A8A]">
          ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไข ลองปรับตัวกรองใหม่
        </div>
      )}

      <div className="mt-12">
        <div className="mb-4 text-center text-xs font-bold text-[#8A8A8A]">
          บริษัทที่กำลังเปิดรับตำแหน่งงานผ่านคนตรงปก
        </div>
        <div
          className="marquee-pause-on-hover relative overflow-hidden"
          role="group"
          aria-label="บริษัทที่กำลังเปิดรับตำแหน่งงานผ่านคนตรงปก"
          style={{
            maskImage: "linear-gradient(to right,transparent,#000 8%,#000 92%,transparent)",
            WebkitMaskImage: "linear-gradient(to right,transparent,#000 8%,#000 92%,transparent)",
          }}
        >
          {/* Reversed relative to the job-card row above — two adjacent
              rows drifting the same direction at different speeds read as
              an unintentional glitch, not two distinct content groups. */}
          <div className="animate-marquee-reverse flex w-max gap-3">
            {[...marqueeCompanies, ...marqueeCompanies].map((co, i) => (
              <div
                key={i}
                aria-hidden={i >= marqueeCompanies.length}
                className="flex flex-shrink-0 items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-4 py-2"
              >
                <Avatar size={24} name={co} variant="marble" colors={LOGO_COLORS} square={false} />
                <span className="text-sm font-bold whitespace-nowrap text-[#5C5C5C]">{co}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
