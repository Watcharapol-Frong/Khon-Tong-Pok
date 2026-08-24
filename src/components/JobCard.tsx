import type { Job } from "@/lib/types";

export function JobCard({ job }: { job: Job }) {
  return (
    <div className="flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-5 transition-colors hover:border-[rgba(15,15,15,0.3)]">
      <div>
        <div className="mb-1 flex items-start justify-between gap-2.5">
          <div className="text-base font-extrabold tracking-[-0.01em]">{job.title}</div>
          <div className="flex-shrink-0 text-xs font-extrabold">{job.salary}</div>
        </div>
        <div className="mb-3.5 text-xs text-[#8A8A8A]">{job.company}</div>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {job.skillTags.map((tag) => (
            <span
              key={tag.label}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: tag.bg, color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
        <div className="mb-4 text-[11px] text-[#8A8A8A]">{job.hardSkills}</div>
      </div>
      <div className="flex items-center gap-1 text-xs font-bold text-[#0F0F0F]">
        ดูรายละเอียด <span className="text-[13px]">→</span>
      </div>
    </div>
  );
}
