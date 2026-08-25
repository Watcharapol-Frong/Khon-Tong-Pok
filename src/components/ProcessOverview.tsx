import { STEPS } from "@/lib/data";

// General 3-step summary (play → analyze → match) — deliberately lighter
// than the candidate-specific 4-step journey used on /game (HowItWorks),
// since this page isn't candidate-only anymore and shouldn't re-explain the
// full candidate flow before the audience split even happens below.
// Monochrome numbering per prefers_monochrome_spacious — STEPS carries a
// per-step color field left over from an older design, intentionally unused
// here.
export function ProcessOverview() {
  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
      <div className="mb-8 max-w-[640px]">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          How It Works
        </div>
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          ทำงานยังไง
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
        {STEPS.map((step) => (
          <div key={step.n}>
            <div className="mb-[14px] inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F5] text-[13px] font-extrabold text-[#0F0F0F]">
              {step.n}
            </div>
            <div className="mb-[10px] text-lg font-extrabold tracking-[-0.01em]">{step.title}</div>
            <div className="text-sm leading-[1.7] text-[#5C5C5C]">{step.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
