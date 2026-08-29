"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingMascot } from "@/components/LoadingMascot";
import { getJobSeekerSessionData } from "@/lib/actions/jobSeeker";
import { JobSeekerSessionProvider, type JobSeekerSession } from "@/lib/jobSeekerSessionContext";
import { clearJobSeekerSessionHint } from "@/lib/jobSeekerSession";

/**
 * Wraps any candidate page that requires a signed-in job seeker — centralizes
 * the session read, the redirect guard and the loading fallback, same pattern
 * as CompanyAppLayout on the HR side.
 *
 * The session is resolved entirely on the server: `getJobSeekerSessionData()`
 * takes no argument and reads the httpOnly cookie or the Supabase Auth
 * session. Nothing the browser holds influences who it decides you are.
 *
 * This previously read `{ jobSeekerId }` out of localStorage and passed it to
 * the server, which looked the row up by that id. The old comment here claimed
 * a tampered value "can't grant access to someone else's data"; it could, and
 * with 43 real accounts on record it was a one-line devtools exploit. The
 * localStorage value is gone from the decision entirely — see src/lib/auth.ts.
 *
 * Note this is still a client-side guard: it renders a loading state, then
 * redirects. It protects the *data* (every action re-derives identity
 * server-side) rather than the route. Someone can still reach the URL; they
 * just get nothing back.
 */
export function JobSeekerAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<JobSeekerSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getJobSeekerSessionData().then((data) => {
      if (cancelled) return;
      if (!data) {
        // Clear the leftover hint so a stale value from before this change
        // doesn't keep the navbar showing a signed-in state.
        clearJobSeekerSessionHint();
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
