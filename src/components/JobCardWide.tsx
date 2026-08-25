import Link from "next/link";
import { Check } from "lucide-react";
import type { Job } from "@/lib/types";

function fullSalaryLabel(job: Job) {
  if (job.salaryNote) return job.salaryNote;
  return `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`;
}

export function JobCardWide({
  job,
  isVerified = false,
  matchRate = 92,
}: {
  job: Job;
  isVerified?: boolean;
  matchRate?: number;
}) {
  return (
    <Link
      href={`/job/${job.id}`}
      className="flex cursor-pointer flex-col rounded-xl border border-[rgba(15,15,15,0.1)] bg-white p-3 transition-all hover:border-[rgba(15,15,15,0.3)] shadow-xs sm:p-3.5"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 truncate">
          <div className="mb-1 flex items-center gap-2">
            {/* No match % shown until the candidate has actually played the
                assessment — a placeholder "xx%" here has no real number
                behind it, so it read as a fake stat rather than a locked
                one. The page-level CTA already covers "log in to unlock
                Match Rate", so this isn't the only place that's said. */}
            {isVerified && (
              <span className="rounded-md bg-[#3BF55C] px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#0F0F0F] whitespace-nowrap">
                <span className="hidden sm:inline">Match </span>{matchRate}%
              </span>
            )}
            <h3 className="min-w-0 truncate text-sm font-extrabold tracking-[-0.01em] text-[#0F0F0F] sm:text-base">
              {job.title}
            </h3>
          </div>
          <div className="truncate text-[11px] text-[#8A8A8A] sm:text-xs">
            {job.company}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <div className="text-[11px] font-extrabold whitespace-nowrap sm:text-xs text-[#0F0F0F]">
            {fullSalaryLabel(job)}
          </div>
          {job.interviewNote && (
            <span className="rounded-md bg-[rgba(77,124,255,0.1)] px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap text-[#4D7CFF] sm:px-2 sm:text-[10px]">
              {job.interviewNote}
            </span>
          )}
        </div>
      </div>

      {/* Verified: show why this specific match happened (matches
          MatchShowcase's "เพราะ: + reasons" pattern on the homepage) instead
          of the job's generic requirement pills — more meaningful once
          there's an actual personalized match to explain. Unverified: no
          match to explain yet, so just show what the job is looking for. */}
      {isVerified ? (
        <div className="my-2 flex flex-col gap-1">
          <div className="text-[10px] text-[#8A8A8A] sm:text-[11px]">เพราะ:</div>
          {job.skillTags.slice(0, 3).map((tag) => (
            <div key={tag.label} className="flex items-center gap-1.5 text-[11px] text-[#5C5C5C] sm:text-xs">
              <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#0f5c22]" strokeWidth={2.5} />
              {tag.label.split(" ≥")[0]}
            </div>
          ))}
        </div>
      ) : (
        <div className="my-2 flex flex-wrap gap-1.5">
          {job.skillTags.map((tag) => (
            <span
              key={tag.label}
              className="rounded-md px-2 py-[3px] text-[10px] font-bold sm:text-[11px]"
              style={{ background: tag.bg, color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[rgba(15,15,15,0.06)] pt-2">
        <div className="min-w-0 truncate text-[10px] text-[#8A8A8A] sm:text-[11px]">
          {job.hardSkills}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold whitespace-nowrap text-[#0F0F0F] sm:text-xs">
          ดูรายละเอียด <span className="text-xs sm:text-[13px]">→</span>
        </div>
      </div>
    </Link>
  );
}
