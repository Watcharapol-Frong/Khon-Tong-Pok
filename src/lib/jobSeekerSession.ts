// Client-side storage for the job seeker auth session — deliberately
// minimal: just the id needed to re-fetch the real session data from the
// database (see getJobSeekerSessionData in src/lib/actions/jobSeeker.ts),
// not a JWT/session token. JobSeekerAuthGuard treats this id as an
// untrusted hint, not proof of identity — getJobSeekerSessionData re-fetches
// the row server-side rather than trusting anything about it client-side.

const SESSION_KEY = "ktp_jobseeker_session";

export type JobSeekerSessionIds = { jobSeekerId: string };

function isBrowser() {
  return typeof window !== "undefined";
}

export function setJobSeekerSessionIds(ids: JobSeekerSessionIds) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(ids));
}

export function getJobSeekerSessionIds(): JobSeekerSessionIds | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as JobSeekerSessionIds).jobSeekerId === "string"
    ) {
      return parsed as JobSeekerSessionIds;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearJobSeekerSessionIds() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}
