"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingMascot } from "@/components/LoadingMascot";
import { getJobSeekerSessionData } from "@/lib/actions/jobSeeker";
import { JobSeekerSessionProvider, type JobSeekerSession } from "@/lib/jobSeekerSessionContext";
import { clearJobSeekerSessionIds, getJobSeekerSessionIds } from "@/lib/jobSeekerSession";

/**
 * Wraps any candidate page that requires a logged-in job seeker (currently
 * just /decoder) — centralizes the session-read + redirect-guard +
 * loading-fallback, same pattern as CompanyAppLayout on the HR side
 * (src/app/company/(app)/layout.tsx). A plain wrapper component rather than
 * a Next layout segment, since only one route needs this so far.
 *
 * Session flow: only { jobSeekerId } lives in localStorage (see
 * jobSeekerSession.ts) — real jobSeeker data is fetched fresh from the
 * database on mount via getJobSeekerSessionData, so a stale/tampered
 * localStorage value can't grant access to someone else's data.
 */
export function JobSeekerAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<JobSeekerSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ids = getJobSeekerSessionIds();
    if (!ids) {
      router.replace("/login");
      return;
    }

    getJobSeekerSessionData(ids.jobSeekerId).then((data) => {
      if (cancelled) return;
      if (!data) {
        clearJobSeekerSessionIds();
        router.replace("/login");
        return;
      }
      setSession(data);
      setChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked || !session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <LoadingMascot />
      </div>
    );
  }

  return <JobSeekerSessionProvider value={session}>{children}</JobSeekerSessionProvider>;
}
