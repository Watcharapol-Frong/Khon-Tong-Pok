"use client";

type Step = 1 | 2 | 3 | 4;

interface StepItem {
  step: Step;
  title: string;
  href: string;
  icon: (active: boolean, done: boolean) => React.ReactNode;
}

const STEPS: StepItem[] = [
  {
    step: 1,
    title: "Role Selection",
    href: "/onboarding",
    icon: (active, done) => (
      <svg
        className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
          active ? "text-[#0F0F0F]" : done ? "text-[#3BF55C]" : "text-[#8A8A8A]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Mini-Games",
    href: "/play",
    icon: (active, done) => (
      <svg
        className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
          active ? "text-[#0F0F0F]" : done ? "text-[#3BF55C]" : "text-[#8A8A8A]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
      >
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h4m-2-2v4m7-2h.01M17 10h.01" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "AI Decoder",
    href: "/decoder",
    icon: (active, done) => (
      <svg
        className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
          active ? "text-[#0F0F0F]" : done ? "text-[#3BF55C]" : "text-[#8A8A8A]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    step: 4,
    title: "Smart Profile",
    href: "/profile",
    icon: (active, done) => (
      <svg
        className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
          active ? "text-[#0F0F0F]" : done ? "text-[#3BF55C]" : "text-[#8A8A8A]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

export function AssessmentStepBar({ currentStep }: { currentStep: Step }) {
  return (
    <div className="mx-auto w-full max-w-[700px] px-4 pt-5 pb-3">
      {/* 100% Balanced Stepper Container */}
      <div className="relative flex items-start justify-between">
        {STEPS.map((item, idx) => {
          const isDone = currentStep > item.step;
          const isActive = currentStep === item.step;

          return (
            <div key={item.step} className="relative z-10 flex flex-1 flex-col items-center">
              {/* Circle Wrapper with identical 52px / 60px dimensions for all 4 steps */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`relative flex h-13 w-13 items-center justify-center rounded-full transition-all duration-300 sm:h-15 sm:w-15 ${
                    isActive
                      ? "border-[2.5px] border-[#0F0F0F] bg-white shadow-lg ring-4 ring-[rgba(15,15,15,0.06)]"
                      : isDone
                        ? "border-2 border-[#3BF55C] bg-[#3BF55C]/10"
                        : "border-2 border-[rgba(15,15,15,0.18)] bg-white"
                  }`}
                >
                  {/* Top-Right Status Dot */}
                  {isDone && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#3BF55C] text-[9px] font-extrabold text-[#0F0F0F] shadow-xs">
                      ✓
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4D7CFF] ring-2 ring-white shadow-xs" />
                  )}

                  {/* Uniform Vector Icon */}
                  {item.icon(isActive, isDone)}
                </div>
              </div>

              {/* Step Label Centered on Exact Same Baseline */}
              <span
                className={`mt-2.5 text-center text-xs tracking-tight transition-colors ${
                  isActive
                    ? "font-extrabold text-[#0F0F0F]"
                    : isDone
                      ? "font-bold text-[#0F0F0F]"
                      : "font-semibold text-[#8A8A8A]"
                }`}
              >
                {item.title}
              </span>

              {/* Dotted Line Connector Centered Vertically Behind Circles */}
              {idx < STEPS.length - 1 && (
                <div className="absolute top-[26px] left-[50%] right-[-50%] -z-10 flex -translate-y-1/2 items-center justify-center px-4 sm:top-[30px]">
                  <div className="flex items-center gap-1.5 opacity-40">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        currentStep > item.step ? "bg-[#3BF55C]" : "bg-[rgba(15,15,15,0.4)]"
                      }`}
                    />
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        currentStep > item.step ? "bg-[#3BF55C]" : "bg-[rgba(15,15,15,0.4)]"
                      }`}
                    />
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        currentStep > item.step ? "bg-[#3BF55C]" : "bg-[rgba(15,15,15,0.4)]"
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
