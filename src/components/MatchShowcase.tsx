import Link from "next/link";
import { Check } from "lucide-react";
import { JOBS } from "@/lib/data";

// Role changed from "job board preview" to "proof the matching mechanism
// works" — no salary/company/hard-skill list, since nobody here is
// choosing a job yet. Just title, an illustrative Match %, and the soft
// skills behind it. One job per category keeps the 3 examples from
// looking dev-only.
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

const MATCH_RATES = [92, 88, 90];

export function MatchShowcase() {
  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,56px)]">
      <div className="mb-8 text-center">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          Match Recommendation
        </div>
        <h2 className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.02em]">
          ตัวอย่างการ Match จาก Soft Skill จริง
        </h2>
      </div>
      <div className="mx-auto grid max-w-[900px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        {SHOWCASE_JOBS.map((job, i) => (
          <Link
            key={job.id}
            href={`/job/${job.id}`}
            className="cursor-pointer rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-5 transition-colors hover:border-[rgba(15,15,15,0.3)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold tracking-[-0.01em] text-[#0F0F0F]">
                {job.title}
              </div>
              <span className="flex-shrink-0 rounded-md bg-[#3BF55C] px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-[#0F0F0F]">
                Match {MATCH_RATES[i]}%
              </span>
            </div>
            <div className="mb-1.5 text-xs text-[#8A8A8A]">เพราะ:</div>
            <div className="flex flex-col gap-1">
              {job.skillTags.slice(0, 3).map((tag) => (
                <div key={tag.label} className="flex items-center gap-1.5 text-xs text-[#5C5C5C]">
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#0f5c22]" strokeWidth={2.5} />
                  {tag.label.split(" ≥")[0]}
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
