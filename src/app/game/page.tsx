import type { Metadata } from "next";
import Link from "next/link";
import { Gamepad2, Gauge, Handshake, Shuffle, Target } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { StrategyPanel } from "@/components/StrategyPanel";
import { GAME_STAGES, STEPS } from "@/lib/data";

const GAME_ICONS = { risk: Gauge, flexibility: Shuffle, focus: Target, collaboration: Handshake };

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
              เริ่มเล่นเกมเลย →
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

      {/* 4 mini-games */}
      <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
        <h2 className="mb-2 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          มินิเกมของเรา
        </h2>
        <p className="mb-8 max-w-[560px] text-sm leading-[1.7] text-[#5C5C5C]">
          แต่ละเกมพัฒนาจากแบบทดสอบทางจิตวิทยาและประสาทวิทยาศาสตร์ที่ใช้จริงในงานวิจัย มาตรฐานการวัดผลแต่ละด้านกำหนดไว้ชัดเจน เพื่อให้ผลลัพธ์ที่ได้สะท้อนพฤติกรรมจริง ไม่ใช่คำตอบที่เตรียมมา
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {GAME_STAGES.map((game) => {
            const GameIcon = GAME_ICONS[game.iconKey];
            return (
            <div
              key={game.id}
              className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-6 transition-all hover:border-[rgba(15,15,15,0.25)]"
            >
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `${game.color}26` }}
              >
                <GameIcon className="h-5 w-5" style={{ color: game.color }} strokeWidth={2} />
              </div>
              <div className="mb-1 text-base font-extrabold tracking-[-0.01em]">{game.title}</div>
              <div className="mb-3 text-xs font-bold" style={{ color: game.color }}>
                {game.subtitle}
              </div>
              <div className="text-sm leading-[1.7] text-[#5C5C5C]">{game.desc}</div>
            </div>
            );
          })}
        </div>
      </div>

      {/* What it measures */}
      <StrategyPanel />

      {/* After the game */}
      <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
        <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          หลังเล่นจบแล้วยังไงต่อ
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

      {/* Closing CTA */}
      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(56px,7vw,80px)]">
        <div className="rounded-[28px] bg-[#F5F5F5] p-[clamp(36px,5vw,56px)] text-center">
          <h2 className="mb-3.5 text-[clamp(24px,3.4vw,36px)] font-extrabold tracking-[-0.02em]">
            พร้อมเล่นเกมแล้วหรือยัง?
          </h2>
          <p className="mx-auto mb-7 max-w-[480px] text-sm leading-[1.7] text-[#5C5C5C]">
            ใช้เวลาไม่ถึง 10 นาที ไม่ต้องมีประสบการณ์ก็เริ่มได้ แล้วปลดล็อกตำแหน่งงานที่แมตช์กับตัวตนจริงของคุณ
          </p>
          <Link
            href="/register"
            className="inline-block cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
          >
            เริ่มเล่นเกมเลย →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
