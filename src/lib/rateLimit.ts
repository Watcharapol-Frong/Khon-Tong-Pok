import "server-only";

/**
 * A small fixed-window limiter for login attempts.
 *
 * WHY IT'S NEEDED EVEN WITH HASHING
 * ---------------------------------
 * scrypt makes *offline* guessing expensive, once someone already has the
 * database. It does nothing about *online* guessing: without a limit, anyone
 * can post to the login action in a loop. The passwords in this database were
 * chosen by real people for a hackathon signup, so a few thousand attempts
 * against a common-password list would land.
 *
 * WHAT THIS IS NOT
 * ----------------
 * State lives in this process's memory. That is fine for one server, and it is
 * what we are running — but on Vercel each serverless instance keeps its own
 * counter, so the real ceiling is (limit x number of warm instances), and
 * everything resets on a cold start. A proper version keeps counters in
 * Postgres or Redis. This is deliberately the cheap version: it stops a laptop
 * running a script, not a distributed attacker, and that's the threat that
 * actually exists between now and the pitch.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 นาที
const MAX_ATTEMPTS = 8;

// Without this the map grows once per distinct email anyone ever types, which
// is a slow memory leak an attacker can drive on purpose.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Only meaningful when `allowed` is false. */
  retryAfterSec: number;
}

/**
 * Counts one attempt against `key` and says whether to proceed.
 *
 * Call this BEFORE verifying the password, not after — a limiter that only
 * counts failures still lets an attacker measure timing on every request.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** Clears the counter after a successful login, so one typo doesn't linger. */
export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function rateLimitMessage(retryAfterSec: number): string {
  const minutes = Math.ceil(retryAfterSec / 60);
  return `พยายามเข้าสู่ระบบบ่อยเกินไปครับ ลองใหม่อีกครั้งในอีก ${minutes} นาที`;
}
