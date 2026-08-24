"use client";

import Link from "next/link";
import { Clock, Sparkle, Sparkles } from "lucide-react";
import { RadarChart } from "@/components/RadarChart";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AXIS_CHIPS, RADAR_DATA } from "@/lib/data";

// Same handful-not-a-shower sparkle treatment and pastel set as the
// company-side hero (src/app/company/page.tsx) — kept to a few accents
// around the headline text only. mascot-hero-candidate.png already has its
// own baked-in sparkles/speech-bubble props, so a sparkle placed near the
// mascot just stacks a second, redundant set of stars on top of it — reads
// as clutter, not accent.
const HERO_SPARKLES = [
  { top: "2%", left: "6%", size: 16, color: "#F5D949", rotate: -12 },
  { top: "8%", right: "8%", size: 15, color: "#FF5CA8", rotate: -10 },
];

export function Hero() {
  const { isMobile, isTablet } = useBreakpoint();
  const centerHero = isMobile || isTablet;
  const radarSize = isMobile ? 230 : 290;

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,15,15,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.05) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 60% 55% at 30% 35%,#000 40%,transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 30% 35%,#000 40%,transparent 100%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-[clamp(28px,4vw,64px)] px-[clamp(20px,4vw,48px)] pt-[clamp(48px,8vw,88px)] pb-[clamp(28px,4vw,44px)]">
        <div
          className={`relative min-w-0 flex-[1_1_440px] ${centerHero ? "flex flex-col items-center text-center" : ""}`}
        >
          {HERO_SPARKLES.map((s, i) => (
            <Sparkle
              key={i}
              className="pointer-events-none absolute hidden sm:block"
              style={{ top: s.top, left: s.left, right: s.right, transform: `rotate(${s.rotate}deg)` }}
              width={s.size}
              height={s.size}
              fill={s.color}
              color={s.color}
              strokeWidth={1}
            />
          ))}

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FAFAFA] px-4 py-1.5 text-xs font-bold tracking-wider text-[#0F0F0F] uppercase">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            <span>AI-Powered Assessment</span>
          </div>

          <h1 className="mb-[22px] text-[clamp(36px,6vw,60px)] leading-[1.08] font-extrabold tracking-[-0.03em]">
            พิสูจน์ศักยภาพจริง
            <br />
            ด้วยตัวตนและทักษะ
          </h1>
          <p
            className={`mb-8 max-w-[520px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] text-[#4A4A4A] ${centerHero ? "mx-auto" : ""}`}
          >
            ให้เรซูเม่ของคุณทรงพลังยิ่งขึ้น! รวมประวัติการทำงานของคุณ
            เข้ากับการเล่นเกมสั้นสนุกๆของเรา
            เพื่อดึงจุดเด่นและสไตล์การทำงานจริงที่คุณมี ให้ HR เห็นชัดเจนตั้งแต่วันแรก
          </p>
          <div
            className={`mb-[18px] flex flex-wrap gap-3 ${centerHero ? "justify-center" : ""}`}
          >
            <Link
              href="/game"
              className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white"
            >
              เริ่มหางาน เล่นเกมเลย
            </Link>
            <Link
              href="/company"
              className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F]"
            >
              หา Candidate (HR)
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#8A8A8A]">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            ใช้เวลาไม่ถึง 10 นาที · ไม่ต้องมีประสบการณ์ก็เล่นได้
          </div>
        </div>

        <div className="relative flex min-w-[280px] flex-[1_1_320px] justify-center">
          <div
            className="w-full max-w-[440px] rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,3vw,36px)]"
            style={{ position: "relative" }}
          >
            <Sparkle
              className="pointer-events-none absolute top-[-16px] left-[-14px] hidden sm:block"
              width={22}
              height={22}
              fill="#3BF55C"
              color="#3BF55C"
              strokeWidth={1}
            />
            <Sparkle
              className="pointer-events-none absolute right-[-10px] bottom-[-12px] hidden rotate-12 sm:block"
              width={16}
              height={16}
              fill="#B14DFF"
              color="#B14DFF"
              strokeWidth={1}
            />
            <div className="mb-[6px] text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
              ตัวอย่างผลประเมิน
            </div>
            <div className="mb-[18px] text-[17px] font-extrabold">
              คุณกันต์ ธ. — Frontend Dev Candidate
            </div>
            <div className="flex justify-center">
              <RadarChart data={RADAR_DATA} size={radarSize} theme="mono" showLabels animate />
            </div>
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              {AXIS_CHIPS.map((chip) => (
                <div
                  key={chip.en}
                  className="rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-[11px] py-[9px] text-[11px] text-[#0F0F0F]"
                >
                  <div className="font-extrabold">{chip.value}%</div>
                  <div className="opacity-60">{chip.th}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
