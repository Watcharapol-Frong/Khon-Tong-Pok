"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Clock, EyeOff, Sparkle, Sparkles, Star } from "lucide-react";
import { RadarChart } from "@/components/RadarChart";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AXIS_CHIPS, RADAR_DATA } from "@/lib/data";

// Same handful-not-a-shower sparkle treatment and pastel set as the
// company-side hero (src/app/company/page.tsx) — same 4-sparkle layout too,
// now that this hero has the same mascot-plus-floating-cards composition
// for the sparkles to sit in the gaps of.
const HERO_SPARKLES = [
  { top: "4%", left: "8%", size: 20, color: "#F5D949", rotate: -15 },
  { top: "10%", right: "22%", size: 15, color: "#B14DFF", rotate: 20 },
  { bottom: "18%", left: "4%", size: 16, color: "#4D7CFF", rotate: 12 },
  { bottom: "6%", right: "10%", size: 18, color: "#FF5CA8", rotate: -10 },
];

// Candidate-side mirror of company/page.tsx's TOP_STRENGTHS card — top 3
// AXIS_CHIPS by score instead of a hardcoded list, since the candidate
// hero doesn't have a fixed persona to hand-pick strengths for.
const TOP_STRENGTHS = [...AXIS_CHIPS].sort((a, b) => b.value - a.value).slice(0, 3);

export function Hero() {
  const { isMobile, isTablet } = useBreakpoint();
  const centerHero = isMobile || isTablet;
  const radarSize = isMobile ? 70 : 100;

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

        {/* Mascot + floating stat cards — right. Same composition as the
            company-side hero (mascot centered, small stat cards floating
            around it, real components/colors instead of decorative
            filler), mirrored for the candidate audience: Blind Review
            becomes "HR sees your skills first," Top Strengths becomes the
            candidate's own top 3 scored axes instead of a fixed persona. */}
        <div className="relative flex min-w-[280px] flex-[1_1_460px] flex-col items-center py-6 sm:block sm:min-w-[640px] sm:py-10">
          {HERO_SPARKLES.map((s, i) => (
            <Sparkle
              key={i}
              className="pointer-events-none absolute hidden sm:block"
              style={{
                top: s.top,
                bottom: s.bottom,
                left: s.left,
                right: s.right,
                transform: `rotate(${s.rotate}deg)`,
              }}
              width={s.size}
              height={s.size}
              fill={s.color}
              color={s.color}
              strokeWidth={1}
            />
          ))}

          {/* Soft Skill — top-left */}
          <div className="absolute top-[4%] right-[calc(50%+146px)] hidden w-[148px] rounded-2xl bg-[#FAFAFA] p-3 sm:block">
            <div className="mb-1 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
              Soft Skill
            </div>
            <div className="flex justify-center">
              <RadarChart data={RADAR_DATA} size={100} theme="mono" showLabels={false} animate={false} />
            </div>
          </div>

          {/* Blind Review, candidate framing — bottom-left */}
          <div className="absolute bottom-[8%] right-[calc(50%+146px)] hidden w-[172px] rounded-2xl bg-[#FAFAFA] p-3.5 sm:block">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
              <EyeOff className="h-3 w-3" strokeWidth={2} />
              Blind Review
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(59,245,92,0.15)]">
                <EyeOff className="h-4 w-4 text-[#0f5c22]" strokeWidth={2} />
              </div>
              <div className="text-[11px] leading-snug font-bold text-[#0F0F0F]">
                HR เห็นทักษะคุณก่อน
                <br />
                ไม่เห็นชื่อ-รูปจนสัมภาษณ์
              </div>
            </div>
          </div>

          {/* Match Insight — top-right */}
          <div className="absolute top-0 left-[calc(50%+146px)] hidden w-[140px] rounded-2xl bg-[#FAFAFA] p-3.5 sm:block">
            <div className="mb-1 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
              Match Insight
            </div>
            <div className="text-2xl font-extrabold text-[#0F0F0F]">92%</div>
            <div className="mt-1 flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <Star key={i} className="h-3 w-3 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
              ))}
              <Star className="h-3 w-3 text-[#E5E5E5]" strokeWidth={1.75} />
            </div>
          </div>

          {/* Top Strengths — bottom-right */}
          <div className="absolute bottom-[2%] left-[calc(50%+146px)] hidden w-[176px] rounded-2xl bg-[#FAFAFA] p-3.5 sm:block">
            <div className="mb-2 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
              Top Strengths
            </div>
            <div className="flex flex-col gap-1.5">
              {TOP_STRENGTHS.map((s) => (
                <div key={s.en} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F0F0F]">
                  <Check className="h-3 w-3 flex-shrink-0 text-[#0f5c22]" strokeWidth={2.5} />
                  {s.th}
                </div>
              ))}
            </div>
          </div>

          <Image
            src="/mascot/mascot-hero-candidate.png"
            alt=""
            width={320}
            height={336}
            className="relative z-10 mx-auto block h-auto w-[220px] object-contain sm:w-[260px]"
          />

          {/* Mobile-only: same four data points, plain 2x2 grid below the
              mascot instead of floating around it — normal flow, nothing
              for it to collide with. */}
          <div className="mt-6 grid w-full max-w-[320px] grid-cols-2 gap-2.5 sm:hidden">
            <div className="rounded-2xl bg-[#FAFAFA] p-3">
              <div className="mb-1.5 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Soft Skill
              </div>
              <div className="flex justify-center">
                <RadarChart data={RADAR_DATA} size={radarSize} theme="mono" showLabels={false} animate={false} />
              </div>
            </div>
            <div className="rounded-2xl bg-[#FAFAFA] p-3">
              <div className="mb-1.5 flex items-center gap-1 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                <EyeOff className="h-2.5 w-2.5" strokeWidth={2} />
                Blind Review
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(59,245,92,0.15)]">
                <EyeOff className="h-3.5 w-3.5 text-[#0f5c22]" strokeWidth={2} />
              </div>
              <div className="mt-1.5 text-[10px] leading-snug font-bold text-[#0F0F0F]">
                HR เห็นทักษะคุณก่อน ไม่เห็นชื่อ-รูปจนสัมภาษณ์
              </div>
            </div>
            <div className="rounded-2xl bg-[#FAFAFA] p-3">
              <div className="mb-1 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Match Insight
              </div>
              <div className="text-xl font-extrabold text-[#0F0F0F]">92%</div>
              <div className="mt-1 flex gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
                ))}
                <Star className="h-2.5 w-2.5 text-[#E5E5E5]" strokeWidth={1.75} />
              </div>
            </div>
            <div className="rounded-2xl bg-[#FAFAFA] p-3">
              <div className="mb-1.5 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Top Strengths
              </div>
              <div className="flex flex-col gap-1">
                {TOP_STRENGTHS.map((s) => (
                  <div key={s.en} className="flex items-center gap-1 text-[10px] font-semibold text-[#0F0F0F]">
                    <Check className="h-2.5 w-2.5 flex-shrink-0 text-[#0f5c22]" strokeWidth={2.5} />
                    {s.th}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
