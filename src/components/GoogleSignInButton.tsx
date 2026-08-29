"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Starts the Google sign-in redirect.
 *
 * All this does is hand the browser to Google. Nothing here decides anything
 * about access — Google sends the user back to `/auth/callback`, which
 * exchanges the code for a session server-side and links it to a row in our
 * database. A user who tampers with this component gets, at most, a different
 * redirect destination; they cannot manufacture a session.
 */

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  /** Which of the two account types to link this Google account to. */
  role?: "candidate" | "hr";
  /** Where to land after a successful sign-in. */
  next?: string;
  label?: string;
}

export function GoogleSignInButton({
  role = "candidate",
  next,
  label = "เข้าสู่ระบบด้วย Google",
}: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rendering a button that can only fail helps nobody — if the keys aren't
  // set this says so plainly instead of throwing on click.
  if (!SUPABASE_CONFIGURED) {
    return (
      <p className="rounded-xl border border-dashed border-[rgba(15,15,15,0.2)] px-3 py-2.5 text-center text-[11px] text-[#8A8A8A]">
        ยังเปิดใช้ Google ไม่ได้ — ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ
        NEXT_PUBLIC_SUPABASE_ANON_KEY ใน frontend/.env.local ก่อนครับ
      </p>
    );
  }

  const handleClick = async () => {
    setError(null);
    setIsRedirecting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const params = new URLSearchParams({
        role,
        next: next ?? (role === "hr" ? "/company/dashboard" : "/decoder"),
      });

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Built from the live origin so the same code works on localhost and
          // on the Vercel deployment without a second env var to forget.
          // Every origin used still has to be listed under
          // Authentication > URL Configuration > Redirect URLs in Supabase.
          redirectTo: `${window.location.origin}/auth/callback?${params.toString()}`,
          queryParams: {
            // Judges will be passing one laptop around with several Google
            // accounts signed in; without this Google silently reuses whoever
            // happens to be first and there's no way to switch.
            prompt: "select_account",
          },
        },
      });

      if (oauthError) throw oauthError;
      // On success the browser navigates away, so the spinner stays until it does.
    } catch (err) {
      console.error("Google sign-in failed to start:", err);
      setError("เริ่มเข้าสู่ระบบด้วย Google ไม่สำเร็จครับ ลองใหม่อีกครั้ง");
      setIsRedirecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRedirecting}
        className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-2.5 text-xs font-bold text-[#0F0F0F] transition-all hover:border-[#0F0F0F] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
      >
        {isRedirecting ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
        ) : (
          <GoogleMark />
        )}
        {isRedirecting ? "กำลังพาไปที่ Google..." : label}
      </button>
      {error && <p className="text-[11px] font-semibold text-[#E5484D]">{error}</p>}
    </div>
  );
}

export default GoogleSignInButton;
