"use client";

type Step = 1 | 2 | 3 | 4;

interface StepItem {
  step: Step;
  title: string;
  href: string;
  // Each step's own pastel, drawn from the same 6-color set already used
  // for SOFT_SKILL_AXIS_META/hero sparkles elsewhere — not a one-off
  // palette invented for this component.
  color: string;
  icon: (className: string) => React.ReactNode;
}

const STEPS: StepItem[] = [
  {
    step: 1,
    title: "Role Selection",
    href: "/onboarding",
    color: "#FF6E5C",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    color: "#F5D949",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h4m-2-2v4m7-2h.01M17 10h.01" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "น้องตรงปก",
    href: "/decoder",
    color: "#4D7CFF",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    color: "#3BF55C",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

export function AssessmentStepBar({ currentStep }: { currentStep: Step }) {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pt-5 pb-3">
      {/* Same soft-fill, no-border pill treatment as the navbar itself —
          this used to float directly on the page as bordered outline
          circles, which matched neither. */}
      <div className="relative flex items-start justify-between rounded-[28px] bg-[#FAFAFA] px-4 py-5 sm:px-6">
        {STEPS.map((item, idx) => {
          const isDone = currentStep > item.step;
          const isActive = currentStep === item.step;
          const isReached = isDone || isActive;

          return (
            <div key={item.step} className="relative z-10 flex flex-1 flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 sm:h-14 sm:w-14"
                  style={{
                    backgroundColor: isReached ? `${item.color}1F` : "#FFFFFF",
                  }}
                >
                  {isDone && (
                    <span
                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      ✓
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: item.color }}
                    />
                  )}

                  <div style={{ color: isReached ? item.color : "#B5B5B5" }}>
                    {item.icon("h-5 w-5 sm:h-6 sm:w-6 transition-colors")}
                  </div>
                </div>
              </div>

              <span
                className={`mt-2.5 text-center text-xs tracking-tight transition-colors ${
                  isActive
                    ? "font-extrabold text-[#0F0F0F]"
                    : isDone
                      ? "font-bold text-[#0F0F0F]"
                      : "font-semibold text-[#B5B5B5]"
                }`}
              >
                {item.title}
              </span>

              {idx < STEPS.length - 1 && (
                <div className="absolute top-[24px] left-[50%] right-[-50%] -z-10 flex -translate-y-1/2 items-center justify-center px-4 sm:top-[28px]">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full transition-colors"
                        style={{
                          backgroundColor: currentStep > item.step ? item.color : "#E5E5E5",
                        }}
                      />
                    ))}
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
