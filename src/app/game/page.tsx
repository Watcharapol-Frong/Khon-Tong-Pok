import type { Metadata } from "next";
import Link from "next/link";
import { Gamepad2, Gauge, Handshake, Shuffle, Sparkle, Target } from "lucide-react";
import { ClosingCta } from "@/components/ClosingCta";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { Navbar } from "@/components/Navbar";
import { StrategyPanel } from "@/components/StrategyPanel";
import { GAME_STAGES } from "@/lib/data";

const GAME_ICONS = { risk: Gauge, flexibility: Shuffle, focus: Target, collaboration: Handshake };

// Same handful-not-a-shower sparkle treatment as the homepage Hero.
const HERO_SPARKLES = [
  { top: "2%", left: "10%", size: 16, color: "#F5D949", rotate: -12 },
  { top: "10%", right: "10%", size: 15, color: "#FF5CA8", rotate: -10 },
];

export const metadata: Metadata = {
  title: "ประเมินด้วยมินิเกม — คนตรงปก (KhonTongPok)",
};

export default function GamePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.05) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 30%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 30%,#000 40%,transparent 100%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-[900px] px-[clamp(20px,4vw,48px)] pt-[clamp(48px,8vw,88px)] pb-[clamp(28px,4vw,44px)] text-center">
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

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] px-4 py-1.5 text-xs font-bold tracking-wider text-[#0F0F0F] uppercase">
            <Gamepad2 className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Neuroscience Game Assessment</span>
          </div>

          <h1 className="mb-6 text-[clamp(32px,6vw,56px)] leading-[1.15] font-extrabold tracking-[-0.03em]">
            พิสูจน์ศักยภาพจริง
            <br />
            เหนือกว่าแค่เรซูเม่
          </h1>

          <p className="mx-auto mb-8 max-w-[600px] text-[clamp(14px,1.8vw,16px)] leading-[1.7] text-[#4A4A4A]">
            ชุดมินิเกมประสาทวิทยาศาสตร์ (Neuroscience Games) ที่วัดตัวตนและสไตล์การทำงานจริงของคุณ
            ไม่ต้องมีเรซูเม่ก่อนก็เริ่มได้ หลังประเมินเสร็จระบบช่วยสร้างหรืออัปโหลดเรซูเม่เพื่อยื่นสมัครได้เลย
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
            >
              เริ่มเล่นเกมเพื่อประเมิน →
            </Link>
            <Link
              href="/job"
              className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white"
            >
              เรียกดู Job Board
            </Link>
          </div>
        </div>
      </div>

      {/* 4 mini-games — same dark-panel + monochrome white card composition
          as StrategyPanel/HowItWorks below it, so all three read as one
          design system instead of this one looking like an older page. */}
      <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(40px,6vw,64px)]">
        <div className="rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,52px)] text-white">
          <div className="mb-[18px] inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#9A9A9A] uppercase">
            4 มินิเกม
          </div>
          <h2 className="mb-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
            มินิเกมของเรา
          </h2>
          <p className="mb-[30px] max-w-[640px] text-sm leading-[1.7] text-[#B5B5B5]">
            แต่ละเกมพัฒนาจากแบบทดสอบทางจิตวิทยาและประสาทวิทยาศาสตร์ที่ใช้จริงในงานวิจัย
            มาตรฐานการวัดผลแต่ละด้านกำหนดไว้ชัดเจน เพื่อให้ผลลัพธ์ที่ได้สะท้อนพฤติกรรมจริง ไม่ใช่คำตอบที่เตรียมมา
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
            {GAME_STAGES.map((game) => {
              const GameIcon = GAME_ICONS[game.iconKey];
              return (
                <div key={game.id} className="min-w-0 rounded-2xl bg-white p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F5]">
                    <GameIcon className="h-4 w-4 text-[#0F0F0F]" strokeWidth={2} />
                  </div>
                  <div className="text-sm font-bold text-[#0F0F0F]">{game.title}</div>
                  <div className="mt-1 mb-2 text-xs font-bold text-[#5C5C5C]">{game.subtitle}</div>
                  <div className="text-xs leading-[1.6] text-[#5C5C5C]">{game.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What it measures */}
      <StrategyPanel />

      {/* After the game — same "ทำงานยังไง" journey used on the homepage,
          instead of a separate/older 3-step section drifting out of sync
          with it. */}
      <HowItWorks />

      {/* Closing CTA — shared with the homepage; title/primary overridden
          since the default primary CTA points at /game, which would
          self-link here. Secondary left at its default (Job Board). */}
      <ClosingCta
        title="พร้อมเล่นเกมแล้วหรือยัง?"
        primaryHref="/register"
        primaryLabel="เริ่มเล่นเกมเพื่อประเมิน →"
      />

      <Footer />
    </div>
  );
}
