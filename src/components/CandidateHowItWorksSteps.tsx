import { Fragment } from "react";
import { BarChart3, ChevronDown, ChevronRight, Gamepad2, Target, Users } from "lucide-react";

export type CandidateStep = {
  n: string;
  iconKey: "users" | "gamepad" | "chart" | "target";
  title: string;
  desc: string;
};

// lucide icon components can't cross the Server → Client Component
// boundary as props (they're functions, not serializable data), so the
// page passes a plain string key and this map resolves it locally — same
// convention as CompanyHowItWorksSteps.
const ICONS = { users: Users, gamepad: Gamepad2, chart: BarChart3, target: Target };

/**
 * Candidate-side counterpart to CompanyHowItWorksSteps — a modular,
 * repeated card component read left-to-right as one journey rather than 4
 * separate features. Card anatomy is fixed top-to-bottom (Step badge →
 * Icon → Title → Description) in the same position on every card so the
 * eye can scan across the row. Cards stretch to equal height
 * (lg:items-stretch) with content centered, since there's no longer a
 * bottom tag/result block to anchor against. Chevrons between cards make
 * the left-to-right progression explicit.
 */
export function CandidateHowItWorksSteps({ steps }: { steps: CandidateStep[] }) {
  return (
    <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch">
      {steps.map((step, i) => {
        const Icon = ICONS[step.iconKey];
        return (
          <Fragment key={step.n}>
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-[#FAFAFA] p-5 text-center sm:p-6">
              <div className="mb-2 text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Step {step.n}
              </div>
              <div className="mb-3 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white">
                <Icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={2} />
              </div>
              <div className="mb-2 text-lg font-extrabold tracking-[-0.01em] text-[#0F0F0F]">{step.title}</div>
              <div className="text-sm leading-[1.6] text-[#5C5C5C]">{step.desc}</div>
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
