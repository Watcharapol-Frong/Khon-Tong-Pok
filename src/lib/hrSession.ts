/**
 * A cosmetic hint about whether an HR user is signed in — NOT a credential.
 *
 * This used to hold `{ hrUserId, companyId }`, and every HR action took those
 * two ids from here and used them to scope its queries. The action layer
 * "verified" that hrUserId belonged to companyId, but both came out of this
 * same object, so the check only confirmed the caller had been consistent with
 * themselves: substituting another company's pair returned that company's
 * candidates, matches and dashboard.
 *
 * The real session is an httpOnly cookie (or a Supabase Auth session) and the
 * company is derived server-side on every call — see src/lib/auth.ts.
 */

const HINT_KEY = "ktp_hr_signed_in";

function isBrowser() {
  return typeof window !== "undefined";
}

export function setHRSessionHint() {
  if (!isBrowser()) return;
  window.localStorage.setItem(HINT_KEY, "1");
  // Drop the pre-change key so old ids don't linger in returning browsers.
  window.localStorage.removeItem("ktp_hr_session");
}

export function hasHRSessionHint(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(HINT_KEY) === "1";
}

export function clearHRSessionHint() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(HINT_KEY);
  window.localStorage.removeItem("ktp_hr_session");
}
