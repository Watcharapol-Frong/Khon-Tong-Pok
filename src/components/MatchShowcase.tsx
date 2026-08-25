import Link from "next/link";
import { JobCard } from "@/components/JobCard";
import { JOBS } from "@/lib/data";

// Deliberately lightweight — no search/filter/marquee, just proof that real
// matching happens. The full filterable job board already lives at /job;
// this only needs to prove the concept and hand off, not duplicate it.
// One job per category keeps the 3 examples from looking dev-only.
const SHOWCASE_JOBS = (() => {
  const seen = new Set<string>();
  const picked = [];
  for (const job of JOBS) {
    if (seen.has(job.category)) continue;
    seen.add(job.category);
    picked.push(job);
    if (picked.length === 3) break;
  }
  return picked;
})();

export function MatchShowcase() {
  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
            Match Showcase
          </div>
          <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
            ตัวอย่างตำแหน่งงานที่ Match ด้วย Soft Skill จริง
          </h2>
        </div>
        <Link
          href="/job"
          className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 text-sm font-bold text-[#0F0F0F] transition-opacity hover:opacity-60"
        >
          ดูตำแหน่งงานทั้งหมด <span className="text-base">→</span>
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {SHOWCASE_JOBS.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
