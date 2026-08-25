"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkle, Sparkles } from "lucide-react";
import { RadarChart } from "@/components/RadarChart";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AXIS_CHIPS, RADAR_DATA } from "@/lib/data";

// Same handful-not-a-shower sparkle treatment and pastel set as the
// company-side hero (src/app/company/page.tsx) — kept to a few accents
// around the headline text only. mascot-hero-candidate.png already has its
// own baked-in sparkles/speech-bubble props, so a sparkle placed near the
// mascot just stacks a second, redundant set of stars on top of it — reads
// as clutter, not accent.
//
// Positioned just above the column (negative px, not a percentage of the
// column's own height) so they never land on the "AI-Powered Matching"
// badge — that badge is the column's first child, and the column's width
// (and therefore its height, since text reflows) varies a lot between the
// two-column desktop layout and the single-column wrapped one, so a
// percentage-based top coincided with the badge at some in-between widths.
const HERO_SPARKLES = [
  { top: "-14px", left: "10%", size: 16, color: "#F5D949", rotate: -12 },
  { top: "-10px", right: "6%", size: 15, color: "#FF5CA8", rotate: -10 },
];

// Sparkle-corner accent from AuthCard's card shell (login/register), minus
// the flat accent square — tried that here too, but per feedback it read
// as a stray green blob rather than a deliberate accent, same call as
// JobFilterBar.
const CARD_SPARKLES = [
  { top: "2%", left: "-18px", size: 26, color: "#F5D949", rotate: -18, opacity: 0.65 },
  { top: "10%", right: "-18px", size: 20, color: "#B14DFF", rotate: 15, opacity: 0.6 },
  { bottom: "14%", left: "-20px", size: 18, color: "#4D7CFF", rotate: 20, opacity: 0.6 },
  { bottom: "4%", right: "-14px", size: 22, color: "#FF5CA8", rotate: -12, opacity: 0.6 },
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
            <span>AI-Powered Matching</span>
          </div>

          {/* Leads with the platform's actual axis (matching people <-> orgs)
              rather than "come play a game" — that framing sells the
              jobseeker journey first and only reveals the HR side
              afterward, even once the CTAs below branch into both. */}
          <h1
            className={`mb-[22px] max-w-[560px] text-[clamp(26px,4.2vw,42px)] leading-[1.25] font-extrabold tracking-[-0.02em] ${centerHero ? "mx-auto" : ""}`}
          >
            เราเปลี่ยนวิธีที่คนและองค์กรค้นหาความเหมาะสมระหว่างกัน
          </h1>
          <p
            className={`mb-8 max-w-[520px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] text-[#4A4A4A] ${centerHero ? "mx-auto" : ""}`}
          >
            ใช้ข้อมูลพฤติกรรมจริงจากมินิเกมประสาทวิทยาศาสตร์และการวิเคราะห์ด้วย AI
            แทนการเดาใจกันจากเรซูเม่หรือประกาศงาน ให้ทั้งคนหางานและองค์กรเจอคนที่ใช่ได้เร็วขึ้น
          </p>
          {/* The journey fork lives directly in Hero's CTAs, not a separate
              ChooseYourJourney section below — it's a navigation decision
              (each button is a hard link off this page), so it should be
              answerable the instant someone reads the headline, not after a
              scroll. */}
          <div
            className={`flex flex-wrap gap-3 ${centerHero ? "justify-center" : ""}`}
          >
            <Link
              href="/game"
              className="flex cursor-pointer items-center gap-2 rounded-full bg-[#0F0F0F] py-3 pr-[26px] pl-3 text-[15px] font-bold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Image
                src="/mascot/mascot-navbar-icon.png"
                alt=""
                width={44}
                height={44}
                className="h-7 w-7 flex-shrink-0 rounded-full bg-white/10 object-contain"
              />
              สำหรับผู้หางาน
            </Link>
            <Link
              href="/company"
              className="flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-[#0F0F0F] bg-white py-[11px] pr-6 pl-3 text-[15px] font-bold text-[#0F0F0F] transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Image
                src="/mascot/mascot-navbar-icon.png"
                alt=""
                width={44}
                height={44}
                className="h-7 w-7 flex-shrink-0 rounded-full bg-[#FAFAFA] object-contain"
              />
              สำหรับองค์กร
            </Link>
          </div>
        </div>

        <div className="relative flex min-w-[300px] flex-[1_1_380px] justify-center">
          {CARD_SPARKLES.map((s, i) => (
            <Sparkle
              key={i}
              className="pointer-events-none absolute hidden sm:block"
              style={{
                top: s.top,
                bottom: s.bottom,
                left: s.left,
                right: s.right,
                opacity: s.opacity,
                transform: `rotate(${s.rotate}deg)`,
              }}
              width={s.size}
              height={s.size}
              fill={s.color}
              color={s.color}
              strokeWidth={1}
            />
          ))}

          <div className="relative w-full max-w-[500px] rounded-2xl bg-[#F5F5F5] p-[clamp(24px,3vw,36px)]">
            <div className="mb-[6px] text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
              ตัวอย่างผลประเมิน
            </div>
            <div className="mb-[18px] text-[17px] font-extrabold">
              คุณกันต์ ธ. — Frontend Dev Candidate
            </div>
            <div className="flex justify-center">
              <RadarChart data={RADAR_DATA} size={radarSize} theme="mono" showLabels animate />
            </div>
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {AXIS_CHIPS.map((chip) => (
                <div
                  key={chip.en}
                  className="rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-3.5 py-3 text-[#0F0F0F]"
                >
                  <div className="text-sm font-extrabold">{chip.value}%</div>
                  <div className="mt-0.5 text-xs opacity-60">{chip.th}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
