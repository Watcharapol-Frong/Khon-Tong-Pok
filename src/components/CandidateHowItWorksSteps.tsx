import { BarChart3, Gamepad2, Star, Target, Users } from "lucide-react";

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
 * Candidate-side counterpart to CompanyHowItWorksSteps' visual language
 * (dark panel, light cards) but laid out as a static equal-size grid
 * instead of a click-to-cycle carousel — the auto-cycling "active" card
 * used to grow and show extra detail chips that the others didn't, so the
 * row's height changed every few seconds and shifted everything below it
 * on the page. A plain grid with every card always showing its full
 * content has no state to cause that, and every card is naturally the
 * same size via CSS grid's default row-stretch.
 */
export function CandidateHowItWorksSteps({ steps }: { steps: CandidateStep[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step) => {
        const Icon = ICONS[step.iconKey];
        return (
          <div key={step.n} className="flex flex-col rounded-2xl bg-[#FAFAFA] p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white">
                <Icon className="h-4 w-4 text-[#0F0F0F]" strokeWidth={2} />
              </div>
              <div className="text-[11px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Step {step.n}
              </div>
            </div>
            <div className="mb-2 text-lg font-extrabold tracking-[-0.01em] text-[#0F0F0F]">{step.title}</div>
            <div className="text-sm leading-[1.7] text-[#5C5C5C]">{step.desc}</div>

            {step.detailType === "role" && (
              <div className="mt-4 flex flex-wrap gap-1.5">
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
              <div className="mt-4 flex flex-wrap gap-1.5">
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
              <div className="mt-4 flex flex-wrap gap-1.5">
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
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-3.5 py-2.5">
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
        );
      })}
    </div>
  );
}
