"use client";

import { createContext, useContext } from "react";
import type { JobSeeker } from "@prisma/client";

/** JobSeeker minus the plaintext password field — never sent to the client. See registerJobSeeker/loginJobSeeker/getJobSeekerSessionData in src/lib/actions/jobSeeker.ts, all of which strip it before returning. */
export type SafeJobSeeker = Omit<JobSeeker, "password">;

export type JobSeekerSession = { jobSeeker: SafeJobSeeker };

const JobSeekerSessionContext = createContext<JobSeekerSession | null>(null);

/** Provided once by JobSeekerAuthGuard after it resolves the session from the id in localStorage (see src/lib/jobSeekerSession.ts) — every authenticated candidate page reads it via useJobSeekerSession() instead of re-deriving its own session. */
export function JobSeekerSessionProvider({
  value,
  children,
}: {
  value: JobSeekerSession;
  children: React.ReactNode;
}) {
  return <JobSeekerSessionContext.Provider value={value}>{children}</JobSeekerSessionContext.Provider>;
}

/** Only valid inside JobSeekerAuthGuard's subtree — that guard never renders children until a session is resolved, so the null case here is a programmer-error guard (used outside the guard), not a real runtime state to handle. */
export function useJobSeekerSession(): JobSeekerSession {
  const session = useContext(JobSeekerSessionContext);
  if (!session) {
    throw new Error("useJobSeekerSession must be used within JobSeekerAuthGuard");
  }
  return session;
}
