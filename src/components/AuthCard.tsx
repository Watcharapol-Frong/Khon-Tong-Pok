"use client";

import { Sparkle } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

// Anchored to the card itself (percentage top/bottom, small fixed px for
// left/right) rather than the wide outer section — sitting out in that
// empty peripheral space read as disconnected from the card, the actual
// content people are looking at. Hugging the card's own corners instead
// keeps them clearly part of the same visual object.
const CARD_SPARKLES = [
  { top: "2%", left: "-18px", size: 28, color: "#F5D949", rotate: -18, opacity: 0.65 },
  { top: "12%", right: "-20px", size: 22, color: "#B14DFF", rotate: 15, opacity: 0.6 },
  { bottom: "16%", left: "-22px", size: 20, color: "#4D7CFF", rotate: 20, opacity: 0.6 },
  { bottom: "4%", right: "-16px", size: 24, color: "#FF5CA8", rotate: -12, opacity: 0.6 },
];

type AuthCardProps = {
  /** Only the very first screen of a flow (a plain login form, register's
   * email step) gets the mascot peeking over the top edge — once mid-flow
   * (register's createCompany/createAdmin/join), the step indicator takes
   * that visual role instead. */
  isEntryStep: boolean;
  stepIndicator?: ReactNode;
  title: string;
  subtitle: string;
  /** Corner accent square — HR pages use the app's HR-blue, candidate pages
   * use candidate-green, keeping that existing distinction while sharing
   * every other part of the shell. */
  accentColor?: string;
  trustMessage: string;
  children: ReactNode;
};

/**
 * Single source of truth for every login/register card in the app (HR and
 * candidate side alike) — background grid, mascot, title/subtitle, and the
 * trust section are defined once here so pages can't drift out of sync with
 * each other. Pages only supply what's actually different between them:
 * title, subtitle, accent color, trust copy, step indicator, and the form
 * itself (as children).
 */
export function AuthCard({
  isEntryStep,
  stepIndicator,
  title,
  subtitle,
  accentColor = "#4D7CFF",
  trustMessage,
  children,
}: AuthCardProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:px-8">
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

      <div
        className={`relative w-full max-w-[460px] ${isEntryStep ? "mt-[96px] sm:mt-[124px]" : ""}`}
      >
        {CARD_SPARKLES.map((s, i) => (
          <Sparkle
            key={i}
            className="pointer-events-none absolute"
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

        {isEntryStep && (
          // Flush alignment (offset = rendered height) put the whole
          // mascot above the card with a hard seam at the edge; nudged
          // down from that so some of the lower body settles into the
          // card, then back up slightly from there. z-10 keeps all of it
          // visible either way.
          <div className="pointer-events-none absolute -top-[96px] left-1/2 z-10 w-[150px] -translate-x-1/2 sm:-top-[124px] sm:w-[190px]">
            <Image
              src="/mascot/mascot-welcome-auth-oncard.png"
              alt=""
              width={190}
              height={132}
              className="h-auto w-full object-contain"
            />
          </div>
        )}

        <div className="relative rounded-2xl bg-[#F5F5F5] p-[clamp(24px,5vw,40px)]">
          <div
            className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl"
            style={{ backgroundColor: accentColor }}
          />

          <div className="mb-6 text-center">
            {stepIndicator}

            <h1 className="text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.03em]">
              {title}
            </h1>
            <p className="mt-1.5 text-xs text-[#8A8A8A]">{subtitle}</p>
          </div>

          {children}

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgba(15,15,15,0.1)]" />
            <span className="flex-shrink-0 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
              ปลอดภัย น่าเชื่อถือ
            </span>
            <div className="h-px flex-1 bg-[rgba(15,15,15,0.1)]" />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Image
              src="/mascot/mascot-secure.png"
              alt=""
              width={40}
              height={40}
              className="h-8 w-8 flex-shrink-0 object-contain"
            />
            <span className="text-xs leading-snug text-[#8A8A8A]">{trustMessage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
