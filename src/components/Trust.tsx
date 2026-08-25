import { Check } from "lucide-react";

// Condensed from a 3-column icon+paragraph section into a single row of
// badges — reads as reinforcement right before the CTA, not another
// feature set to read through.
const TRUST_POINTS = ["งานวิจัยรองรับ", "Blind Review", "Data Privacy"];

export function Trust() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(24px,3vw,32px)] text-center">
      <div className="mb-4 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
        ทำไมถึงเชื่อถือเรา?
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {TRUST_POINTS.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] px-4 py-2 text-sm font-bold text-[#0F0F0F]"
          >
            <Check className="h-3.5 w-3.5 text-[#0f5c22]" strokeWidth={2.5} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
