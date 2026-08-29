"use client";

import { useEffect, useRef } from "react";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { JobSeekerAuthGuard } from "@/components/JobSeekerAuthGuard";
import { Navbar } from "@/components/Navbar";
import { saveGameResult } from "@/lib/actions/jobSeeker";
import { mountGameApp } from "@/lib/games/runtime";
import type { RadarChartOutput } from "@/lib/games/analytics/pipeline";
import { useJobSeekerSession } from "@/lib/jobSeekerSessionContext";
import "./game.css";

// Same card/chrome language as the rest of the assessment flow (Navbar +
// AssessmentStepBar + Footer, #FAFAFA rounded card on a faint grid
// background) — this used to be a separate full-screen mint-green mini-app
// matching game-main's own standalone look, but that read as a different
// product mid-flow. The real engine (src/lib/games/runtime.ts) now renders
// into this card instead of taking over the whole viewport.
function GameArena() {
  const { jobSeeker } = useJobSeekerSession();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const destroy = mountGameApp(root, {
      onComplete: (radar: RadarChartOutput) => {
        saveGameResult(jobSeeker.id, radar).catch((err) => {
          console.error("Failed to save game result", err);
        });
      },
    });

    return destroy;
  }, [jobSeeker.id]);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 md:px-8">
      {/* Background Grid — same treatment as /game's hero and the old mock */}
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
        <div
          id="ktp-game-root"
          ref={rootRef}
          className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(20px,4vw,36px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]"
        />
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <JobSeekerAuthGuard>
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <Navbar />
        <AssessmentStepBar currentStep={2} />
        <GameArena />
        <Footer />
      </div>
    </JobSeekerAuthGuard>
  );
}
