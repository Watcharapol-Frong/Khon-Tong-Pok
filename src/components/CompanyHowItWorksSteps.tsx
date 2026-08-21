"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Bot, CalendarCheck, ChevronDown, ChevronRight, FileText, Star } from "lucide-react";

export type CompanyStep = {
  n: string;
  iconKey: "file" | "bot" | "calendar";
  title: string;
  desc: string;
  detailType: "tags" | "match" | "status";
};

// lucide icon components can't cross the Server → Client Component
// boundary as props (they're functions, not serializable data), so the
// page passes a plain string key and this map resolves it locally.
const ICONS = { file: FileText, bot: Bot, calendar: CalendarCheck };

const DETAIL_TAGS = ["Hard Skill", "Culture Fit", "6 มิติ"];

const AUTO_CYCLE_MS = 3200;
const PAUSE_AFTER_CLICK_MS = 7000;

function timeIsUp(deadline: number) {
  return Date.now() >= deadline;
}

function deadlineFromNow(ms: number) {
  return Date.now() + ms;
}

/**
 * Click any step number to make it the active/expanded one — each reveals
 * its own small illustrative detail (tags / match rate / interview status)
 * instead of the middle step being permanently hardcoded as the hero.
 *
 * Auto-cycles on a timer so the interactivity is self-demonstrating —
 * nothing else on the page told a first-time visitor these were
 * clickable, so it shows itself instead of relying on a hover cue nobody
 * would find. A manual click pauses the cycle for a while so it doesn't
 * fight the user's own choice.
 */
export function CompanyHowItWorksSteps({ steps }: { steps: CompanyStep[] }) {
  const [active, setActive] = useState(1);
  const pausedUntilRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (!timeIsUp(pausedUntilRef.current)) return;
      setActive((prev) => (prev + 1) % steps.length);
    }, AUTO_CYCLE_MS);
    return () => clearInterval(id);
  }, [steps.length]);

  const selectStep = (i: number) => {
    setActive(i);
    pausedUntilRef.current = deadlineFromNow(PAUSE_AFTER_CLICK_MS);
  };

  return (
    <div>
      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
        {steps.map((step, i) => {
          const isActive = i === active;
          const Icon = ICONS[step.iconKey];
          return (
            <Fragment key={step.n}>
              <button
                type="button"
                onClick={() => selectStep(i)}
                className={`cursor-pointer rounded-2xl p-5 text-left transition-colors sm:p-6 ${
                  isActive ? "bg-white/10 lg:flex-[1.3]" : "bg-white/5 hover:bg-white/[0.07] lg:flex-1"
                }`}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "bg-[#4D7CFF]" : "bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                  </div>
                  <div className="text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                    Step {step.n}
                  </div>
                </div>
                <div className="mb-2 text-lg font-extrabold tracking-[-0.01em] text-white">{step.title}</div>
                <div className="text-sm leading-[1.7] text-[#B5B5B5]">{step.desc}</div>

                {isActive && step.detailType === "match" && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2.5">
                    <div className="text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                      ตัวอย่าง Match Rate
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-extrabold text-white">92%</span>
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3].map((j) => (
                          <Star key={j} className="h-3 w-3 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
                        ))}
                        <Star className="h-3 w-3 text-white/20" strokeWidth={1.75} />
                      </div>
                    </div>
                  </div>
                )}

                {isActive && step.detailType === "tags" && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {DETAIL_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isActive && step.detailType === "status" && (
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(59,245,92,0.15)] px-3 py-1.5 text-xs font-bold text-[#3BF55C]">
                    นัดสัมภาษณ์แล้ว · พรุ่งนี้ 14:00
                  </div>
                )}
              </button>

              {i < steps.length - 1 && (
                <div className="flex items-center justify-center py-0.5 lg:px-1 lg:py-0">
                  <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#4A4A4A] lg:hidden" strokeWidth={2.5} />
                  <ChevronRight
                    className="hidden h-5 w-5 flex-shrink-0 text-[#4A4A4A] lg:block"
                    strokeWidth={2.5}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
