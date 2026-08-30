import { NextResponse, type NextRequest } from "next/server";

import { linkSupabaseUserToJobSeeker, linkSupabaseUserToHRUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Google sends the candidate back to after they approve sign-in.
 *
 * Supabase redirects here with a one-time `code`; exchanging it sets the
 * session cookies. Only after that do we touch our own tables — the Prisma
 * JobSeeker/HRUser row is created or linked on first successful sign-in, so
 * there is no separate "register with Google" flow to keep in sync.
 *
 * `next` decides where they land afterwards and `role` decides which of our
 * two account types to link. Both come from the query string, so both are
 * treated as untrusted input below.
 */

/** Only ever redirect within this app — an open redirect here is a phishing primitive. */
function safeNext(raw: string | null): string {
  if (!raw) return "/decoder";
  // Rejects "https://evil.example", protocol-relative "//evil.example", and
  // anything that isn't a plain in-app path.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/decoder";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const role = searchParams.get("role") === "hr" ? "hr" : "candidate";

  // Google itself can report a failure (user pressed cancel, consent denied).
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("ไม่ได้รับรหัสยืนยันจาก Google ครับ ลองกดเข้าสู่ระบบใหม่อีกครั้ง")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        error?.message ?? "แลกรหัสยืนยันไม่สำเร็จครับ ลองใหม่อีกครั้ง",
      )}`,
    );
  }

  try {
    if (role === "hr") {
      await linkSupabaseUserToHRUser(data.user);
    } else {
      await linkSupabaseUserToJobSeeker(data.user);
    }
  } catch (err) {
    // The Supabase session is valid at this point but our own row couldn't be
    // written. Signing back out avoids a half-logged-in state where the user
    // appears authenticated and then every page fails to find their profile.
    console.error("Failed to link Supabase user to a local account:", err);
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "เข้าสู่ระบบกับ Google ได้ แต่สร้างบัญชีในระบบไม่สำเร็จครับ ลองใหม่อีกครั้ง",
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
