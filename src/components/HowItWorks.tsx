import { STEPS } from "@/lib/data";

export function HowItWorks() {
  return (
    <div
      id="how-it-works"
      className="mx-auto w-full max-w-[1240px] scroll-mt-[90px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]"
    >
      <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
        ทำงานยังไง
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
        {STEPS.map((step) => (
          <div key={step.n}>
            <div
              className="mb-[14px] inline-flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-extrabold text-[#0F0F0F]"
              style={{ background: step.color }}
            >
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
