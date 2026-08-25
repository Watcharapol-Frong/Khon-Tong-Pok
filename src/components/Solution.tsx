import { ArrowRight } from "lucide-react";

// Redesigned from a mascot + long-paragraph card into a single before/after
// comparison — "one image, understood instantly" per content-pruning pass,
// rather than explaining the mechanism in prose.
export function Solution() {
  return (
    <div className="mx-auto w-full max-w-[820px] px-[clamp(20px,4vw,48px)] pb-[clamp(40px,6vw,56px)] text-center">
      <div className="mb-6 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
        คนตรงปกแก้ปัญหานี้ยังไง
      </div>
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] px-7 py-5">
          <div className="mb-1 text-[11px] font-bold text-[#8A8A8A] uppercase">จากเดิม</div>
          <div className="text-base font-bold text-[#8A8A8A] line-through decoration-[rgba(15,15,15,0.3)]">
            Resume + Keyword
          </div>
        </div>
        <ArrowRight className="h-5 w-5 flex-shrink-0 rotate-90 text-[#8A8A8A] sm:rotate-0" strokeWidth={2} />
        <div className="rounded-2xl bg-[#0F0F0F] px-7 py-5">
          <div className="mb-1 text-[11px] font-bold text-[#9A9A9A] uppercase">เป็น</div>
          <div className="text-base font-extrabold text-white">Behavior Data + AI Matching</div>
        </div>
      </div>
    </div>
  );
}
