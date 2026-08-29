/**
 * Supabase connection details, read once and validated loudly.
 *
 * These two values are public by design — the anon/publishable key is meant to
 * ship in the browser bundle. What protects the data is Row Level Security in
 * Postgres, not the secrecy of this key. That is the whole reason
 * `ai-service/db/010_team_security.sql` matters: with RLS off, this key is a
 * skeleton key to every row.
 *
 * The service-role key must NEVER appear in this file or anywhere else under
 * `src/` — it bypasses RLS entirely.
 */

// Supabase renamed the anon key to "publishable key" in the newer dashboard.
// Both names are accepted so that whichever one someone copies out of the
// dashboard works, instead of failing with an empty-string key at runtime.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const SUPABASE_CONFIGURED = Boolean(url && key);

/**
 * Throws with the exact steps to fix it rather than letting the Supabase
 * client fail later with a generic network error — a misconfigured env var at
 * 2am before a pitch should say what to do, not what went wrong.
 */
export function requireSupabaseConfig(): { url: string; key: string } {
  if (!url || !key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Supabase\n" +
        "สร้างไฟล์ frontend/.env.local แล้วใส่:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n" +
        "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...\n" +
        "หาได้ที่ Supabase Dashboard > Project Settings > API Keys",
    );
  }
  return { url, key };
}
