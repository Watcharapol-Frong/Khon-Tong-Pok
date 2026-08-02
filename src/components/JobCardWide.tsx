import type { Job } from "@/lib/types";

function fullSalaryLabel(job: Job) {
  if (job.salaryNote) return job.salaryNote;
  return `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`;
}

export function JobCardWide({ job }: { job: Job }) {
  return (
    <div className="flex cursor-pointer flex-col rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-5 transition-colors hover:border-[rgba(15,15,15,0.3)]">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2.5">
        <div className="text-base font-extrabold tracking-[-0.01em]">{job.title}</div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <div className="text-xs font-extrabold">{fullSalaryLabel(job)}</div>
          {job.interviewNote && (
            <span className="rounded-md bg-[rgba(77,124,255,0.1)] px-2 py-0.5 text-[10px] font-bold text-[#4D7CFF]">
              {job.interviewNote}
            </span>
          )}
        </div>
      </div>
      <div className="mb-3.5 text-xs text-[#8A8A8A]">{job.company}</div>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {job.skillTags.map((tag) => (
          <span
            key={tag.label}
            className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
            style={{ background: tag.bg, color: tag.color }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-[#8A8A8A]">{job.hardSkills}</div>
        <div className="flex flex-shrink-0 items-center gap-1 text-xs font-bold whitespace-nowrap text-[#0F0F0F]">
          ดูรายละเอียด <span className="text-[13px]">→</span>
        </div>
      </div>
    </div>
  );
}
