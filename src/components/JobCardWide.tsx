import type { Job } from "@/lib/types";

function fullSalaryLabel(job: Job) {
  if (job.salaryNote) return job.salaryNote;
  return `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`;
}

export function JobCardWide({ job }: { job: Job }) {
  return (
    <div className="flex cursor-pointer flex-col rounded-xl border border-[rgba(15,15,15,0.1)] bg-white p-3.5 transition-colors hover:border-[rgba(15,15,15,0.3)] sm:rounded-2xl sm:p-5">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-extrabold tracking-[-0.01em] sm:text-base">
          {job.title}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <div className="text-[11px] font-extrabold whitespace-nowrap sm:text-xs">
            {fullSalaryLabel(job)}
          </div>
          {job.interviewNote && (
            <span className="rounded-md bg-[rgba(77,124,255,0.1)] px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap text-[#4D7CFF] sm:px-2 sm:text-[10px]">
              {job.interviewNote}
            </span>
          )}
        </div>
      </div>
      <div className="mb-2.5 truncate text-[11px] text-[#8A8A8A] sm:mb-3.5 sm:text-xs">
        {job.company}
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5 sm:mb-3.5">
        {job.skillTags.map((tag) => (
          <span
            key={tag.label}
            className="rounded-md px-2 py-[3px] text-[10px] font-bold sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[11px]"
            style={{ background: tag.bg, color: tag.color }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 truncate text-[10px] text-[#8A8A8A] sm:text-[11px]">
          {job.hardSkills}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold whitespace-nowrap text-[#0F0F0F] sm:text-xs">
          ดูรายละเอียด <span className="text-xs sm:text-[13px]">→</span>
        </div>
      </div>
    </div>
  );
}
