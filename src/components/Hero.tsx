"use client";

import Link from "next/link";
import { Building2, ChevronDown, Sparkle, Sparkles, Target, User, Waves } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

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

// Answers "how do the two sides actually meet" without spoiling a result —
// the sample Smart Profile/radar chart that used to live here moved to its
// own ExampleResult section (after How It Works, where "what does the
// output look like" is actually the question someone's asking).
const FLOW_NODES = [
  { icon: User, label: "Candidate" },
  { icon: Waves, label: "Behavioral Data" },
  { icon: Sparkles, label: "AI" },
  { icon: Target, label: "Matching" },
  { icon: Building2, label: "Company" },
];

export function Hero() {
  const { isMobile, isTablet } = useBreakpoint();
  const centerHero = isMobile || isTablet;

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

          {/* Concrete outcome statement instead of the more abstract "we
              change how people and orgs find fit" — easier to grasp on
              first read, while still stating the platform-level value prop
              (not "come play a game") that keeps it audience-neutral. */}
          <h1
            className={`mb-[22px] max-w-[560px] text-[clamp(26px,4.2vw,42px)] leading-[1.25] font-extrabold tracking-[-0.02em] ${centerHero ? "mx-auto" : ""}`}
          >
            เราช่วยให้คนเจองานที่เหมาะ และองค์กรเจอคนที่ใช่ จากศักยภาพจริง
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
              className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white"
            >
              สำหรับผู้หางาน
            </Link>
            <Link
              href="/company"
              className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F]"
            >
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

          <div className="relative flex w-full max-w-[340px] flex-col items-center rounded-2xl bg-[#F5F5F5] p-[clamp(24px,3vw,36px)]">
            {FLOW_NODES.map((node, i) => (
              <div key={node.label} className="flex flex-col items-center">
                <div className="flex flex-col items-center gap-2 rounded-xl bg-white px-6 py-3.5">
                  <node.icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={1.75} />
                  <div className="text-xs font-bold whitespace-nowrap text-[#0F0F0F]">{node.label}</div>
                </div>
                {i < FLOW_NODES.length - 1 && (
                  <ChevronDown className="my-1.5 h-4 w-4 text-[#8A8A8A]" strokeWidth={2} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
