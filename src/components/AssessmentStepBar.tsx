"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Set by /mentor once the candidate sends their first message there (see
// that page's handleSend) — the only signal this app has for "has this
// candidate ever used the mentor chat", since conversations aren't
// persisted to the database.
export const MENTOR_USED_KEY = "ktp_mentor_used";

type Step = 1 | 2 | 3 | 4;

interface StepItem {
  // A plain number, not the Step union above (currentStep's own type) —
  // the mentor node's step:5 is never a real progress stage (currentStep
  // never reaches it), it just needs a numeric value that always sorts
  // after step 4 for the isDone/isActive comparisons below.
  step: number;
  title: string;
  href: string;
  icon: (className: string) => React.ReactNode;
  // "คุยกับเมนเทอร์" isn't part of the assessment's linear progress — its
  // done/active state is computed from pathname + the mentor-used
  // localStorage flag instead of currentStep (see AssessmentStepBar body)
  // — and it's the only node that's actually clickable (the 4 real steps
  // are progress display only, deliberately not navigable out of order).
  isMentor?: boolean;
}

const STEPS: StepItem[] = [
  {
    step: 1,
    title: "Role Selection",
    href: "/onboarding",
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
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    step: 5,
    title: "คุยกับเมนเทอร์",
    href: "/mentor",
    isMentor: true,
    // A compass, not another chat bubble — the "น้องตรงปก" step above
    // already owns that shape, and this node means guidance/advice, not
    // another conversation-extraction stage.
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-1.5 4.5L9 15l1.5-4.5L15 9z" />
      </svg>
    ),
  },
];

export function AssessmentStepBar({ currentStep }: { currentStep: Step }) {
  const pathname = usePathname();
  // Read once on mount, same as every other localStorage-backed UI flag in
  // this app (e.g. ktp_profile_verified in /job) — a fresh tab briefly
  // renders "not done" before this resolves, which is fine for a status
  // pill, not worth a loading state.
  const [mentorUsed, setMentorUsed] = useState(false);
  useEffect(() => {
    setMentorUsed(localStorage.getItem(MENTOR_USED_KEY) === "true");
  }, []);
  const mentorActive = pathname === "/mentor";

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pt-5 pb-3">
      {/* Same soft-fill, no-border pill treatment as the navbar itself.
          Monochrome + one accent (green = done, matching "Verified"
          elsewhere in the app) instead of a different pastel per step —
          four unrelated colors read as noisy against the rest of the
          site's restrained palette. "คุยกับเมนเทอร์" now uses this exact
          same done/active/not-reached tri-state as the real steps —
          done = has sent a mentor message before, active = currently on
          /mentor, not-reached = neither — instead of a separate fixed
          "always available" look. */}
      <div className="relative flex items-start justify-between px-4 py-5 sm:px-6">
        {STEPS.map((item, idx) => {
          const isDone = item.isMentor ? !mentorActive && mentorUsed : currentStep > item.step;
          const isActive = item.isMentor ? mentorActive : currentStep === item.step;

          const circle = (
            <div className="relative flex items-center justify-center">
              <div
                className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 sm:h-14 sm:w-14 ${
                  isActive
                    ? "bg-[#0F0F0F]"
                    : isDone
                      ? "bg-[rgba(59,245,92,0.15)]"
                      : "bg-white"
                }`}
              >
                {isDone && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#3BF55C] text-[9px] font-extrabold text-[#0F0F0F]">
                    ✓
                  </span>
                )}
                {isActive && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-white ring-2 ring-[#FAFAFA]" />
                )}

                <div className={isActive ? "text-white" : isDone ? "text-[#0f5c22]" : "text-[#B5B5B5]"}>
                  {item.icon("h-5 w-5 sm:h-6 sm:w-6 transition-colors")}
                </div>
              </div>
            </div>
          );

          const label = (
            <div className="mt-2.5 flex flex-col items-center">
              <span
                className={`text-center text-xs tracking-tight transition-colors ${
                  isActive
                    ? "font-extrabold text-[#0F0F0F]"
                    : isDone
                      ? "font-bold text-[#0F0F0F]"
                      : "font-semibold text-[#B5B5B5]"
                }`}
              >
                {item.title}
              </span>
              {/* Distinguishes "คุยกับเมนเทอร์" from the 4 required steps —
                  it's genuinely optional (not part of what "completing"
                  this flow means), but should still read as belonging to
                  the process, not a bolted-on extra, so it stays inline
                  here rather than off to the side. */}
              {item.isMentor && (
                <span className="text-[9px] font-semibold text-[#B5B5B5]">(Optional)</span>
              )}
            </div>
          );

          const connector = idx < STEPS.length - 1 && (
            <div className="absolute top-[24px] left-[50%] right-[-50%] -z-10 flex -translate-y-1/2 items-center justify-center px-4 sm:top-[28px]">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      currentStep > item.step ? "bg-[#3BF55C]" : "bg-[#E5E5E5]"
                    }`}
                  />
                ))}
              </div>
            </div>
          );

          if (item.isMentor) {
            return (
              <Link key={item.step} href={item.href} className="relative z-10 flex flex-1 flex-col items-center">
                {circle}
                {label}
                {connector}
              </Link>
            );
          }

          return (
            <div key={item.step} className="relative z-10 flex flex-1 flex-col items-center">
              {circle}
              {label}
              {connector}
            </div>
          );
        })}
      </div>
    </div>
  );
}
