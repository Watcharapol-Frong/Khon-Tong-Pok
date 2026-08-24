"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Gamepad2, Star, Target, Users } from "lucide-react";

export type CandidateStep = {
  n: string;
  iconKey: "users" | "gamepad" | "chart" | "target";
  title: string;
  desc: string;
  detailType: "role" | "tags" | "axes" | "match";
};

// lucide icon components can't cross the Server → Client Component
// boundary as props (they're functions, not serializable data), so the
// page passes a plain string key and this map resolves it locally — same
// convention as CompanyHowItWorksSteps.
const ICONS = { users: Users, gamepad: Gamepad2, chart: BarChart3, target: Target };

// Same 4 personas as /onboarding's ROLE_GROUPS, kept short for chip display.
const ROLE_TAGS = ["เด็กจบใหม่", "Early Career", "Career Switcher", "Upskiller"];
const GAME_TAGS = ["Neuroscience Games", "~10 นาที", "ไม่ต้องมี Resume"];
const AXIS_TAGS = ["Learning Agility", "Critical Thinking", "Risk Tolerance", "+3 มิติ"];

const AUTO_CYCLE_MS = 3200;
const PAUSE_AFTER_CLICK_MS = 7000;

function timeIsUp(deadline: number) {
  return Date.now() >= deadline;
}

function deadlineFromNow(ms: number) {
  return Date.now() + ms;
}

/**
 * Candidate-side counterpart to CompanyHowItWorksSteps — same black-card,
 * click-to-expand, self-cycling interaction (and the same reasoning for
 * why it auto-cycles: nothing else on the page signals these are
 * clickable), just with candidate-flavored steps/details instead of the
 * HR ones.
 */
export function CandidateHowItWorksSteps({ steps }: { steps: CandidateStep[] }) {
  const [active, setActive] = useState(0);
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
                className={`cursor-pointer rounded-2xl bg-white p-5 text-left transition-all sm:p-6 ${
                  isActive
                    ? "shadow-md ring-2 ring-[#3BF55C] lg:flex-[1.3]"
                    : "opacity-75 hover:opacity-100 lg:flex-1"
                }`}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "bg-[#4D7CFF]" : "bg-[#F5F5F5]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#0F0F0F]"}`} strokeWidth={2} />
                  </div>
                  <div className="text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                    Step {step.n}
                  </div>
                </div>
                <div className="mb-2 text-lg font-extrabold tracking-[-0.01em] text-[#0F0F0F]">{step.title}</div>
                <div className="text-sm leading-[1.7] text-[#5C5C5C]">{step.desc}</div>

                {isActive && step.detailType === "role" && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {ROLE_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-bold text-[#0F0F0F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isActive && step.detailType === "tags" && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {GAME_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-bold text-[#0F0F0F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isActive && step.detailType === "axes" && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {AXIS_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-bold text-[#0F0F0F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isActive && step.detailType === "match" && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F5F5F5] px-3.5 py-2.5">
                    <div className="text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                      ตัวอย่าง Match
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-extrabold text-[#0F0F0F]">92%</span>
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3].map((j) => (
                          <Star key={j} className="h-3 w-3 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
                        ))}
                        <Star className="h-3 w-3 text-[rgba(15,15,15,0.15)]" strokeWidth={1.75} />
                      </div>
                    </div>
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
