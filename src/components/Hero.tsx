import Link from "next/link";
import { ChevronRight, Sparkle, Sparkles } from "lucide-react";

// Same handful-not-a-shower sparkle treatment and pastel set used
// elsewhere on the site — kept to a few accents around the headline only.
const HERO_SPARKLES = [
  { top: "6%", left: "6%", size: 18, color: "#F5D949", rotate: -12 },
  { top: "10%", right: "8%", size: 16, color: "#B14DFF", rotate: 15 },
  { bottom: "8%", right: "14%", size: 15, color: "#FF5CA8", rotate: -10 },
];

// The transformation this whole product is built on, made literal:
// Resume (muted, the old way) building up through the pipeline into
// Match งาน (the payoff, accented). Not a generic "how it works" diagram —
// this one specific story is what makes the product an AI product rather
// than a form to fill out, so it belongs in Hero itself.
const FLOW_STEPS = ["Resume", "Behavioral Data", "AI Profile", "Match งาน"];

export function Hero() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(20px,3vw,32px)]">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0F0F0F] px-[clamp(24px,5vw,64px)] py-[clamp(48px,7vw,80px)] text-center text-white">
        {HERO_SPARKLES.map((s, i) => (
          <Sparkle
            key={i}
            className="pointer-events-none absolute hidden sm:block"
            style={{ top: s.top, bottom: s.bottom, left: s.left, right: s.right, transform: `rotate(${s.rotate}deg)` }}
            width={s.size}
            height={s.size}
            fill={s.color}
            color={s.color}
            strokeWidth={1}
          />
        ))}

        <div className="relative mx-auto max-w-[720px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wider text-white uppercase">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            <span>AI-Powered Matching</span>
          </div>

          {/* The core concept statement, used as the literal headline —
              more evocative than a straightforward benefit sentence, and
              it's exactly what the flow chips below prove. */}
          <h1 className="mb-5 text-[clamp(26px,4.4vw,44px)] leading-[1.3] font-extrabold tracking-[-0.02em]">
            เราไม่ได้หาคนจากสิ่งที่เขาเขียน
            <br />
            แต่จากวิธีที่เขาคิดและทำงานจริง
          </h1>
          <p className="mx-auto mb-10 max-w-[520px] text-[clamp(14px,1.6vw,16px)] leading-[1.7] text-[#B5B5B5]">
            AI วิเคราะห์พฤติกรรมจริงจากมินิเกมประสาทวิทยาศาสตร์ แล้วจับคู่คนกับงานที่ใช่
            ทั้งฝั่งผู้หางานและองค์กร
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
            {FLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <span
                  className={
                    i === 0
                      ? "rounded-full bg-white/10 px-4 py-2 text-xs font-bold whitespace-nowrap text-[#8A8A8A] line-through decoration-[#8A8A8A]"
                      : i === FLOW_STEPS.length - 1
                        ? "rounded-full bg-[#3BF55C] px-4 py-2 text-xs font-extrabold whitespace-nowrap text-[#0F0F0F]"
                        : "rounded-full bg-white px-4 py-2 text-xs font-extrabold whitespace-nowrap text-[#0F0F0F]"
                  }
                >
                  {step}
                </span>
                {i < FLOW_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#8A8A8A]" strokeWidth={2} />
                )}
              </div>
            ))}
          </div>

          {/* The journey fork lives directly in Hero's CTAs, not a separate
              ChooseYourJourney section below — it's a navigation decision
              (each button is a hard link off this page), so it should be
              answerable the instant someone reads the headline. */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/game"
              className="cursor-pointer rounded-full bg-white px-[30px] py-4 text-[15px] font-bold text-[#0F0F0F] transition-opacity hover:opacity-90"
            >
              สำหรับผู้หางาน
            </Link>
            <Link
              href="/company"
              className="cursor-pointer rounded-full border-[1.5px] border-white/30 px-7 py-[15px] text-[15px] font-bold text-white transition-colors hover:bg-white/10"
            >
              สำหรับองค์กร
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
