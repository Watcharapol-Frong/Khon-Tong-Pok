import { NextResponse, type NextRequest } from "next/server";

import { clearLegacySession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Signs the user out of both session sources at once.
 *
 * Clearing only one would leave the other still valid — a Google user whose
 * legacy cookie was never cleared, or vice versa, would appear logged out and
 * then reappear logged in on the next navigation.
 *
 * POST only. A GET sign-out can be triggered by any page that embeds
 * `<img src=".../auth/signout">`, which is a real (if minor) CSRF nuisance.
 */
export async function POST(request: NextRequest) {
  if (SUPABASE_CONFIGURED) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  await clearLegacySession();

  return NextResponse.redirect(new URL("/login", request.url), {
    // 303 so the browser follows with GET rather than repeating the POST.
    status: 303,
  });
}
