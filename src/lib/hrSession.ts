// Client-side storage for the HR auth session — deliberately minimal: just
// the two ids needed to re-fetch the real session data from the database
// (see getHRSessionData in src/lib/actions/company.ts), not a JWT/session
// token. CompanyAppLayout treats these ids as untrusted hints, not proof of
// identity — getHRSessionData re-verifies hrUserId actually belongs to
// companyId server-side before trusting either.

const SESSION_KEY = "ktp_hr_session";

export type HRSessionIds = { hrUserId: string; companyId: string };

function isBrowser() {
  return typeof window !== "undefined";
}

export function setHRSessionIds(ids: HRSessionIds) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(ids));
}

export function getHRSessionIds(): HRSessionIds | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as HRSessionIds).hrUserId === "string" &&
      typeof (parsed as HRSessionIds).companyId === "string"
    ) {
      return parsed as HRSessionIds;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearHRSessionIds() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}
