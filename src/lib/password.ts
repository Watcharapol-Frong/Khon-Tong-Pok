// Deliberately no `import "server-only"` here, unlike the other server modules:
// prisma/hash-passwords.ts runs this outside Next, and that marker throws when
// imported from anywhere but a Server Component. The protection isn't lost —
// this file imports `node:crypto`, which cannot be bundled for the browser, so
// a client import fails at build time with its own clear error.
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing.
 *
 * WHY SCRYPT AND NOT BCRYPT
 * -------------------------
 * scrypt ships inside Node's own crypto module, so this adds no dependency and
 * nothing has to compile at install time. `bcrypt` needs a native build (a
 * recurring source of "works here, fails on Vercel"), and `bcryptjs` is a pure-JS
 * reimplementation that runs an order of magnitude slower for the same security,
 * which in practice pushes people to lower the cost factor.
 *
 * scrypt is also memory-hard, which bcrypt only weakly is: attacking it needs
 * RAM per guess, not just cores, so a GPU farm gains much less.
 *
 * FORMAT
 * ------
 *   scrypt$N$r$p$<salt base64>$<hash base64>
 *
 * Parameters are stored per-hash rather than hardcoded at verify time so that
 * raising the cost later doesn't invalidate every existing password. Old hashes
 * keep verifying with their own parameters and get upgraded on next login (see
 * `needsRehash`).
 *
 * WHAT THIS DOES NOT FIX
 * ----------------------
 * Passwords already in the database are plaintext. Hashing from here forward
 * does nothing for them — they have to be converted by running
 * `npm run db:hash-passwords`, which reads each one and replaces it in place.
 * Until that runs, `verifyPassword` still accepts the legacy plaintext form so
 * the 43 existing accounts can log in, and upgrades each one as its owner does.
 */

// promisify() picks the first overload of scrypt, which is the one without an
// options argument — so the cost parameters below would be silently dropped by
// the type checker's chosen signature. Asserted to the overload we actually use.
const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// 2^15 iterations: roughly 100ms per hash on a laptop, which is slow enough to
// make offline guessing expensive and fast enough that login doesn't feel laggy.
const N = 32768;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_BYTES = 16;

// 128 * N * r = 32MB for these parameters, and Node's default maxmem is exactly
// 32MB — so the default rejects our own cost as too expensive. Raise it rather
// than weakening N.
const MAX_MEM = 96 * 1024 * 1024;

const PREFIX = "scrypt";

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(plain.normalize("NFKC"), salt, KEY_LEN, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEM,
  })) as Buffer;

  return [
    PREFIX,
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** True if `stored` is one of ours rather than a leftover plaintext value. */
export function isHashed(stored: string): boolean {
  return stored.startsWith(PREFIX + "$");
}

/**
 * Constant-time verification.
 *
 * `stored === plain` would leak, through how long the comparison runs, how many
 * leading characters were correct. That matters far more here than it sounds:
 * these are real accounts with reusable passwords.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  if (!isHashed(stored)) {
    // Legacy plaintext row. Still compared in constant time — a value being
    // badly stored is no reason to also compare it carelessly.
    const a = Buffer.from(plain.normalize("NFKC"));
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  const parts = stored.split("$");
  if (parts.length !== 6) return false;

  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // A hash claiming absurd parameters would otherwise let anyone who can write
  // to this column turn a login attempt into a denial of service.
  if (n > 1 << 20 || r > 32 || p > 16) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  let derived: Buffer;
  try {
    derived = (await scryptAsync(plain.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAX_MEM,
    })) as Buffer;
  } catch {
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * True when a stored value should be replaced after a successful login —
 * either it is still plaintext, or it was hashed with weaker parameters than
 * we use now. Rehashing on login converts accounts gradually without ever
 * asking anyone to reset a password.
 */
export function needsRehash(stored: string): boolean {
  if (!isHashed(stored)) return true;
  const parts = stored.split("$");
  if (parts.length !== 6) return true;
  return Number(parts[1]) < N || Number(parts[2]) < R || Number(parts[3]) < P;
}

/**
 * A fixed cost paid when the email doesn't exist at all.
 *
 * Without it, "no such user" returns immediately while "wrong password" takes
 * ~100ms of scrypt — a difference big enough to enumerate which of the team's
 * emails have accounts, straight from the browser's network tab. The generic
 * error message alone doesn't hide that; the timing does.
 */
export async function burnTimeLikeAVerify(): Promise<void> {
  await verifyPassword("no-such-account", DUMMY_HASH);
}

// Hash of a value nobody can supply. Generated once at module load so the cost
// matches a real verify exactly.
const DUMMY_HASH = [
  PREFIX,
  N,
  R,
  P,
  randomBytes(SALT_BYTES).toString("base64"),
  randomBytes(KEY_LEN).toString("base64"),
].join("$");
