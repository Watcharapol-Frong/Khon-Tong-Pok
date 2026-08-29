"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseConfig } from "./config";

/**
 * Supabase client for Client Components — used only to *start* the Google
 * sign-in redirect. Everything that decides access happens server-side (see
 * `src/lib/auth.ts`).
 *
 * Unlike the server client this one is memoised: in the browser there is only
 * ever one user, and `createBrowserClient` is documented as safe to reuse. A
 * fresh instance per render would spin up a new auth listener each time.
 */
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const { url, key } = requireSupabaseConfig();
  cached = createBrowserClient(url, key);
  return cached;
}
