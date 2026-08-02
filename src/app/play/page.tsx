"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

const GAMES_DATA = [
  {
    id: 1,
    title: "เกม: Crypto/Sneaker Drop",
    subtitle: "BART Test — Risk Tolerance & Decision Making",
    icon: "👟",
    desc: "กด 'ปั๊มราคาราคา/มูลค่า' เพื่อเพิ่มคะแนนความเสี่ยง หากปั๊มมากเกินไป สินค้าจะแตก/หลุดมือ! เลือกจังหวะ Cash Out ที่ดีที่สุด",
    color: "#FF6E5C",
  },
  {
    id: 2,
    title: "เกม: Matcha Bar Barista Rush",
    subtitle: "WCST Test — Learning Agility & Cognitive Flexibility",
    desc: "จับคู่สูตรชาเขียวตามกติกาของร้าน โดยกติกาจะแอบเปลี่ยนกะทันหัน ปรับตัวและเรียนรู้รูปแบบใหม่ให้เร็วที่สุด",
    icon: "🍵",
    color: "#3BF55C",
  },
  {
    id: 3,
    title: "เกม: Doomscroll Shield",
    subtitle: "Flanker Task — Focus & Distractor Filtering",
    desc: "กดทิศทางลูกศรตรงกลางให้ถูกต้อง โดยไม่เสียสมาธิตัวรบกวนขนาบข้าง (Doomscroll distractions)",
    icon: "🛡️",
    color: "#4D7CFF",
  },
  {
    id: 4,
    title: "เกม: E-Sport Squad Quest",
    subtitle: "PGG Game — Collaboration Mindset & Resource Sharing",
    desc: "ตัดสินใจจัดสรรเหรียญลงกองกลางของทีมร่วมกับผู้เล่น AI เพื่อประโยชน์สูงสุดของทีมเวิร์ก",
    icon: "🎮",
    color: "#F5D949",
  },
];

export default function PlayPage() {
  const [currentStage, setCurrentStage] = useState(0); // 0 to 3
  const [pumpValue, setPumpValue] = useState(10);
  const [busted, setBusted] = useState(false);
  const [reactionTime, setReactionTime] = useState(240);
  const [scores, setScores] = useState({
    risk: 78,
    agility: 82,
    focus: 80,
    teamwork: 85,
  });
  const [stageFinished, setStageFinished] = useState(false);
  const [allGamesFinished, setAllGamesFinished] = useState(false);

  // Reaction time ticker simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setReactionTime(210 + Math.floor(Math.random() * 50));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const handleAction = () => {
    if (currentStage === 0) {
      // Balloon pump logic
      if (pumpValue >= 90) {
        setBusted(true);
        setTimeout(() => {
          setBusted(false);
          setPumpValue(10);
          advanceStage();
        }, 1200);
      } else {
        setPumpValue((prev) => prev + 20);
      }
    } else {
      advanceStage();
    }
  };

  const handleCashOut = () => {
    advanceStage();
  };

  const advanceStage = () => {
    if (currentStage < GAMES_DATA.length - 1) {
      setCurrentStage((prev) => prev + 1);
      setPumpValue(10);
    } else {
      setAllGamesFinished(true);
    }
  };

  const currentGame = GAMES_DATA[currentStage];

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <AssessmentStepBar currentStep={2} />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 md:px-8">
        {/* Background Grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.04) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 40%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 40%,#000 40%,transparent 100%)",
          }}
        />

        <div className="relative w-full max-w-[800px]">
          <div className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(20px,4vw,36px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            {/* Header Status Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(15,15,15,0.08)] pb-4">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3 py-0.5 text-xs font-bold text-[#5C5C5C]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: currentGame.color }}
                  />
                  Neuroscience Game
                </div>
                <h1 className="text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
                  {allGamesFinished ? "ประมวลผลเกมสำเร็จ!" : currentGame.title}
                </h1>
              </div>

              {/* Reaction Time Display */}
              <div className="flex items-center gap-2 rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-3.5 py-1.5 text-xs font-extrabold">
                <span className="text-[#8A8A8A]">Reaction Time:</span>
                <span className="font-mono text-[#0F0F0F]">{reactionTime} ms</span>
              </div>
            </div>

            {allGamesFinished ? (
              /* All Games Completed Screen */
              <div className="rounded-2xl border border-[rgba(59,245,92,0.4)] bg-[rgba(59,245,92,0.12)] p-6 text-center">
                <div className="mb-2 text-4xl">🎉</div>
                <h2 className="text-xl font-extrabold text-[#0F0F0F]">
                  ประมวลผลเกมสำเร็จ!
                </h2>
                <p className="mx-auto mt-2 max-w-[480px] text-xs leading-[1.6] text-[#4A4A4A]">
                  ระบบ Neuroscience Engine ได้บันทึกสถิติ Reaction Time, Decision Point และพฤติกรรมการตัดสินใจของคุณครบถ้วนแล้ว
                </p>

                {/* Processing Status Notice (Scores hidden until Smart Profile per spec) */}
                <div className="my-6 rounded-xl border border-[rgba(15,15,15,0.08)] bg-white p-4 text-center">
                  <div className="text-xs font-bold text-[#0F0F0F]">
                    🔒 คะแนน 6 Core Metrics ถูกประมวลผลหลังบ้านเรียบร้อยแล้ว
                  </div>
                  <div className="mt-1 text-[11px] text-[#8A8A8A]">
                    (ผลประเมินจะผสานรวมกับประวัติประสบการณ์ และปลดล็อกเต็มรูปแบบใน Smart Profile)
                  </div>
                </div>

                <Link
                  href="/decoder"
                  className="flex w-full items-center justify-center rounded-full bg-[#0F0F0F] py-4 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                >
                  ไปขั้นตอนถัดไป →
                </Link>
              </div>
            ) : (
              /* ACTIVE GAMEPLAY ARENA */
              <div className="flex flex-col gap-6">
                {/* Progress Bar 4 stages */}
                <div className="flex items-center gap-2">
                  {GAMES_DATA.map((g, idx) => (
                    <div
                      key={g.id}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        idx === currentStage
                          ? "bg-[#0F0F0F]"
                          : idx < currentStage
                            ? "bg-[#3BF55C]"
                            : "bg-[rgba(15,15,15,0.12)]"
                      }`}
                    />
                  ))}
                </div>

                {/* Game Canvas Container */}
                <div className="relative flex flex-col items-center justify-center rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-8 text-center min-h-[300px]">
                  <div className="mb-2 text-5xl">{currentGame.icon}</div>
                  <div className="text-sm font-extrabold text-[#0F0F0F]">{currentGame.subtitle}</div>
                  <p className="mt-1 max-w-[480px] text-xs text-[#5C5C5C]">{currentGame.desc}</p>

                  {/* Interactive Game Arena Component */}
                  {currentStage === 0 && (
                    <div className="mt-6 flex flex-col items-center gap-4 w-full">
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#FF6E5C]/10 border-2 border-[#FF6E5C] transition-all">
                        <div
                          className="rounded-full bg-[#FF6E5C] transition-all"
                          style={{
                            width: `${pumpValue}%`,
                            height: `${pumpValue}%`,
                            opacity: busted ? 0.2 : 0.85,
                          }}
                        />
                        <span className="absolute font-mono text-sm font-extrabold text-[#0F0F0F]">
                          {busted ? "💥 แตก!" : `${pumpValue * 10} pts`}
                        </span>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-full bg-[#0F0F0F] px-6 py-3 text-xs font-bold text-white transition-transform active:scale-95"
                        >
                          🎈 ปั๊มมูลค่า (+20 pts)
                        </button>
                        <button
                          type="button"
                          onClick={handleCashOut}
                          className="rounded-full border border-[rgba(15,15,15,0.2)] bg-white px-6 py-3 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F5F5F5]"
                        >
                          💰 Cash Out บันทึกคะแนน
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStage === 1 && (
                    <div className="mt-6 flex flex-col items-center gap-4 w-full">
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-[#3BF55C]/20 px-4 py-2 text-xs font-extrabold text-[#0F0F0F]">
                          กติกาปัจจุบัน: จับคู่ตามประเภทเมนู
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-xl border border-[rgba(15,15,15,0.15)] bg-white px-5 py-3 text-xs font-bold text-[#0F0F0F] hover:bg-[#3BF55C]/20"
                        >
                          🍵 Matcha Latte
                        </button>
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-xl border border-[rgba(15,15,15,0.15)] bg-white px-5 py-3 text-xs font-bold text-[#0F0F0F] hover:bg-[#3BF55C]/20"
                        >
                          🍃 Hojicha Cold
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStage === 2 && (
                    <div className="mt-6 flex flex-col items-center gap-4 w-full">
                      <div className="text-3xl font-extrabold tracking-widest text-[#4D7CFF]">
                        ← ← <span className="text-black text-4xl">➔</span> ← ←
                      </div>
                      <p className="text-[11px] text-[#8A8A8A]">
                        กดตามทิศทางลูกศรตรงกลาง (ตัวรบกวนขนาบข้างหลอกล่อ)
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-xl border border-[rgba(15,15,15,0.15)] bg-white px-6 py-2.5 text-sm font-bold text-[#0F0F0F]"
                        >
                          ← ซ้าย
                        </button>
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-xl bg-[#0F0F0F] px-6 py-2.5 text-sm font-bold text-white"
                        >
                          ขวา ➔
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStage === 3 && (
                    <div className="mt-6 flex flex-col items-center gap-4 w-full">
                      <div className="rounded-xl bg-[#F5D949]/20 px-4 py-2 text-xs font-extrabold text-[#0F0F0F]">
                        จัดสรรเหรียญลงกองกลางทีม: 50 Coins
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-full bg-[#0F0F0F] px-6 py-3 text-xs font-bold text-white"
                        >
                          🤝 บริจาคเข้าทีม 100%
                        </button>
                        <button
                          type="button"
                          onClick={handleAction}
                          className="rounded-full border border-[rgba(15,15,15,0.2)] bg-white px-6 py-3 text-xs font-bold text-[#0F0F0F]"
                        >
                          🛡️ เก็บส่วนตัว 50%
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Skip / Next Stage Button */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#8A8A8A]">
                    เกมที่ {currentStage + 1} จาก 4
                  </span>
                  <button
                    type="button"
                    onClick={advanceStage}
                    className="cursor-pointer text-xs font-bold text-[#0F0F0F] underline hover:opacity-80"
                  >
                    ข้ามไปเกมถัดไป ➔
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
