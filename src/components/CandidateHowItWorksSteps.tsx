import { Fragment } from "react";
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

/**
 * Candidate-side counterpart to CompanyHowItWorksSteps — a modular,
 * repeated card component read left-to-right as one journey rather than 4
 * separate features. Card anatomy is fixed top-to-bottom (Step badge →
 * Icon → Title → Description → Tag/result), the same anatomy in the same
 * position on every card so the eye can scan across the row. Cards
 * stretch to equal height (lg:items-stretch) with the tag/result block
 * pinned to the bottom via mt-auto, so that block lines up across all 4
 * cards regardless of how many lines the description above it wraps to —
 * chevrons between cards make the left-to-right progression explicit.
 */
export function CandidateHowItWorksSteps({ steps }: { steps: CandidateStep[] }) {
  return (
    <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch">
      {steps.map((step, i) => {
        const Icon = ICONS[step.iconKey];
        return (
          <Fragment key={step.n}>
            <div className="flex flex-1 flex-col items-center rounded-2xl bg-[#FAFAFA] p-5 text-center sm:p-6">
              {/* Top area: which step this is, and what it means */}
              <div className="mb-2 text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Step {step.n}
              </div>
              <div className="mb-3 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white">
                <Icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={2} />
              </div>

              {/* Middle area: what happens in this step */}
              <div className="mb-2 text-lg font-extrabold tracking-[-0.01em] text-[#0F0F0F]">{step.title}</div>
              <div className="text-sm leading-[1.6] text-[#5C5C5C]">{step.desc}</div>

              {/* Bottom area: pinned to the same baseline on every card via mt-auto */}
              <div className="mt-auto w-full pt-4">
                {step.detailType === "role" && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {ROLE_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F0F0F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {step.detailType === "tags" && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {GAME_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F0F0F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {step.detailType === "axes" && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {AXIS_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[rgba(15,15,15,0.1)] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F0F0F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {step.detailType === "match" && (
                  <div className="flex flex-col items-center gap-1 rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-3.5 py-2.5">
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
              </div>
            </div>

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
  );
}
