/**
 * A cosmetic hint about whether someone is signed in — NOT a credential.
 *
 * This file used to hold `{ jobSeekerId }` and that id was, in effect, the
 * password: every server action took it and looked the row up directly, so
 * pasting another candidate's id here made you them. The real session now
 * lives in an httpOnly cookie the browser cannot read, and identity is
 * re-derived server-side on every call (see src/lib/auth.ts).
 *
 * What's left is a flag the navbar reads to decide whether to render the
 * notification bell before its server round-trip resolves, so the UI doesn't
 * flicker between logged-out and logged-in on every page load. Nothing here is
 * trusted for access decisions, and nothing here should ever grow back into an
 * identifier — if you find yourself wanting to store the id again, the thing
 * you actually want is a server action that returns it.
 */

const HINT_KEY = "ktp_signed_in";

function isBrowser() {
  return typeof window !== "undefined";
}

export function setJobSeekerSessionHint() {
  if (!isBrowser()) return;
  window.localStorage.setItem(HINT_KEY, "1");
  // Remove the pre-change key so an old id can't linger in a returning
  // visitor's browser storage.
  window.localStorage.removeItem("ktp_jobseeker_session");
}

export function hasJobSeekerSessionHint(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(HINT_KEY) === "1";
}

export function clearJobSeekerSessionHint() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(HINT_KEY);
  window.localStorage.removeItem("ktp_jobseeker_session");
}
