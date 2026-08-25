import { Brain, Sparkles, Target } from "lucide-react";

// Absorbs what used to be a separate PlatformOverview section — both
// answered the same question ("ระบบทำงานยังไง"), which is exactly the kind
// of redundancy this page had too much of. Keeping this one, short:
// icon + title + one line each, no paragraph intro.
//
// "Understand" instead of "AI Profile" for step 2 — AI Profile names the
// feature, Understand names what it does for the user, matching Assess/
// Match's benefit-oriented framing either side of it.
const STEPS = [
  { n: "01", icon: Brain, title: "Assess", desc: "วัดพฤติกรรมจริง" },
  { n: "02", icon: Sparkles, title: "Understand", desc: "สร้าง Smart Profile" },
  { n: "03", icon: Target, title: "Match", desc: "เชื่อมคนกับโอกาส" },
];

export function ProcessOverview() {
  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,56px)]">
      <div className="mb-8 text-center">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          How It Works
        </div>
        <h2 className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.02em]">
          3 ขั้นตอนที่ทำให้ Match แม่นขึ้น
        </h2>
      </div>
      <div className="mx-auto grid max-w-[760px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-8 text-center">
        {STEPS.map((s) => (
          <div key={s.title} className="flex flex-col items-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F5F5]">
              <s.icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={2} />
            </div>
            <div className="mb-0.5 text-[10px] font-bold text-[#8A8A8A]">{s.n}</div>
            <div className="text-sm font-extrabold">{s.title}</div>
            <div className="mt-0.5 text-xs text-[#8A8A8A]">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
