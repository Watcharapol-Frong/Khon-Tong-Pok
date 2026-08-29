import { clearHRSessionHint } from "@/lib/hrSession";
import { clearJobSeekerSessionHint } from "@/lib/jobSeekerSession";

/**
 * Ends the session properly.
 *
 * Clearing localStorage is no longer enough — and never really was. The
 * session now lives in an httpOnly cookie the page cannot touch, plus possibly
 * a Supabase Auth session, so signing out has to happen server-side. The route
 * clears both and redirects; the local calls here only reset the cosmetic
 * "signed in" flags the navbar reads.
 *
 * Submits a real form rather than fetch(): the endpoint answers with a 303
 * redirect, and letting the browser follow it navigates the user to /login in
 * the same step instead of leaving them on a page that now has no session.
 */
export function signOut() {
  clearJobSeekerSessionHint();
  clearHRSessionHint();

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/auth/signout";
  document.body.appendChild(form);
  form.submit();
}
