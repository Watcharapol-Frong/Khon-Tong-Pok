import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_CONFIGURED, requireSupabaseConfig } from "./config";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async in Next 16 (synchronous access was removed, not just
 * deprecated), so this helper is async too and must be awaited at every call
 * site.
 *
 * WHY A NEW CLIENT PER REQUEST
 * ----------------------------
 * The client holds the caller's cookies, which means it holds their session.
 * A module-level singleton would be shared across concurrent requests and
 * could serve one user's session to another — the exact class of bug that is
 * unnoticeable in local testing with one browser open and catastrophic in
 * front of judges.
 */
export async function createSupabaseServerClient() {
  const { url, key } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't write cookies. That's fine and expected:
          // proxy.ts refreshes the session on every request and writes the
          // rotated tokens there, so nothing is lost by swallowing this.
        }
      },
    },
  });
}

/**
 * The signed-in Supabase user, or null.
 *
 * Uses `getUser()`, which verifies the JWT against the Supabase Auth server,
 * rather than `getSession()`, which only decodes whatever is in the cookie.
 * Anything that decides what a request is allowed to see must use this one —
 * a decoded-but-unverified cookie is an assertion by the client, not proof.
 */
export async function getSupabaseUser() {
  // Not configured means "nobody is signed in via Google", not "crash". This
  // matters because getCurrentJobSeeker() calls this first and then falls back
  // to the password-account cookie — throwing here would take the existing
  // email/password login down with it on any machine missing the env vars,
  // which is every teammate who hasn't pulled .env.local yet.
  if (!SUPABASE_CONFIGURED) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}
