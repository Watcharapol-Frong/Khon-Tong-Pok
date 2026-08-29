import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request.
 *
 * Access tokens are short-lived (one hour by default). Without this, a
 * candidate who leaves the tab open through the game and the interview chat
 * gets silently logged out partway through, losing their answers. The refresh
 * token is exchanged here and the rotated cookies are written to the response.
 *
 * NOTE ON THE FILENAME: this is `proxy.ts`, not `middleware.ts`. Next 16
 * renamed the convention; a file named `middleware.ts` is deprecated and this
 * logic would not run at all under the old name in a new project.
 *
 * This file deliberately does NOT gate access to pages. Redirecting from here
 * would be a second, parallel place where "who may see what" is decided, and
 * the two would drift. Authorization lives in one place: `src/lib/auth.ts`,
 * called by the pages themselves. This is only session upkeep.
 */

// Read directly rather than through lib/supabase/config: the docs for the
// proxy convention specifically warn against relying on shared modules here,
// since it can be deployed to a CDN edge separately from the app.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export async function proxy(request: NextRequest) {
  // Not configured yet (e.g. a teammate who hasn't pulled .env.local) — pass
  // requests straight through instead of 500-ing the entire site.
  if (!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // The request copy is updated first so that anything rendered later in
        // this same pass sees the new tokens rather than the expired ones.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Supabase supplies no-store headers here. They matter on Vercel:
        // without them a CDN can cache a response carrying Set-Cookie and hand
        // one candidate's session token to the next visitor.
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  // Must happen before the response is returned — a refresh that completes
  // after the response is committed can't write its cookies anywhere.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Without a matcher this runs on every static asset too, which would put an
  // auth round-trip in front of every CSS and image request.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|pdfjs|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
