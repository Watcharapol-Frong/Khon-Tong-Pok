import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { readOrFallback } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getSupabaseUser } from "@/lib/supabase/server";

/**
 * The single place that answers "who is making this request".
 *
 * WHAT THIS REPLACES
 * ------------------
 * The previous flow put `{ jobSeekerId }` in localStorage and every guard
 * called `getJobSeekerSessionData(id)`, which did `findUnique({ where: { id } })`
 * on the id the browser supplied. A comment claimed a tampered value "can't
 * grant access to someone else's data", but re-reading a row by a client-chosen
 * id is exactly granting it: paste another candidate's cuid into localStorage
 * and you are them. With 43 real accounts in the database that is a live
 * account-takeover hole, not a prototype shortcut.
 *
 * Nothing here takes an id from the caller. Identity comes from one of two
 * server-verified sources and nowhere else:
 *
 *   1. A Supabase Auth session (Google sign-in). Verified by `getUser()`,
 *      which checks the JWT with the auth server rather than decoding a cookie.
 *   2. A signed, httpOnly cookie issued by us, for the accounts that already
 *      existed with an email/password before Google sign-in was added.
 *
 * Source 2 exists so the accounts that predate Google sign-in keep working.
 * Those passwords are hashed with scrypt now (see lib/password.ts); rows still
 * holding a plaintext value verify against it once and are rehashed on the
 * spot, and `npm run db:hash-passwords` converts the rest without waiting for
 * their owners to log in.
 */

const LEGACY_COOKIE = "ktp_session";
const SESSION_DAYS = 7;

/**
 * Signing key for source 2. Absent means legacy sessions are refused outright
 * rather than falling back to something unsigned — an auth system that
 * degrades to "trust the client" when misconfigured is worse than one that
 * stops working, because nobody notices.
 */
function secret(): string | null {
  return process.env.AUTH_SECRET?.trim() || null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

interface SessionPayload {
  sub: string;
  role: "candidate" | "hr";
  exp: number;
}

function sign(payload: SessionPayload, key: string): string {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token: string, key: string): SessionPayload | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = createHmac("sha256", key).update(body).digest("base64url");
  const givenBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a length mismatch, and
  // comparing with === would leak how much of the signature was correct.
  if (givenBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(givenBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (payload.role !== "candidate" && payload.role !== "hr") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Issued only after the caller has actually proven the password. */
export async function createLegacySession(sub: string, role: "candidate" | "hr") {
  const key = secret();
  if (!key) {
    throw new Error(
      "ยังไม่ได้ตั้ง AUTH_SECRET ใน frontend/.env.local\n" +
        "สร้างค่าสุ่มยาว ๆ ด้วย: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  const token = sign(
    { sub, role, exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 },
    key,
  );

  const store = await cookies();
  store.set(LEGACY_COOKIE, token, {
    httpOnly: true, // not readable by JavaScript, unlike the old localStorage id
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

async function readLegacySession(): Promise<SessionPayload | null> {
  const key = secret();
  if (!key) return null;
  const store = await cookies();
  const token = store.get(LEGACY_COOKIE)?.value;
  if (!token) return null;
  return verify(token, key);
}

// ---------------------------------------------------------------------------
// Who is signed in
// ---------------------------------------------------------------------------

export type SafeJobSeeker = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

/**
 * Never returns the password column. It is stripped here, at the boundary,
 * rather than at each call site — a call site that forgets is a leak, and
 * Server Action return values go straight to the browser.
 */
export async function getCurrentJobSeeker(): Promise<SafeJobSeeker | null> {
  const supabaseUser = await getSupabaseUser();

  if (supabaseUser) {
    // Wrapped so an unreachable database reads as "signed out" instead of
    // throwing during render and taking the whole page with it. See lib/db.ts.
    const bySupabase = await readOrFallback(
      () =>
        prisma.jobSeeker.findUnique({
          where: { supabaseUserId: supabaseUser.id },
          select: { id: true, name: true, email: true, avatarUrl: true },
        }),
      null,
    );
    if (bySupabase) return bySupabase;
    // Signed into Supabase but never linked (e.g. signed up as HR). Fall
    // through rather than returning a half-session.
  }

  const legacy = await readLegacySession();
  if (legacy?.role === "candidate") {
    return readOrFallback(
      () =>
        prisma.jobSeeker.findUnique({
          where: { id: legacy.sub },
          select: { id: true, name: true, email: true, avatarUrl: true },
        }),
      null,
    );
  }

  return null;
}

export type SafeHRUser = {
  id: string;
  name: string;
  email: string;
  companyId: string;
};

export async function getCurrentHRUser(): Promise<SafeHRUser | null> {
  const supabaseUser = await getSupabaseUser();

  if (supabaseUser) {
    const bySupabase = await readOrFallback(
      () =>
        prisma.hRUser.findUnique({
          where: { supabaseUserId: supabaseUser.id },
          select: { id: true, name: true, email: true, companyId: true },
        }),
      null,
    );
    if (bySupabase) return bySupabase;
  }

  const legacy = await readLegacySession();
  if (legacy?.role === "hr") {
    return readOrFallback(
      () =>
        prisma.hRUser.findUnique({
          where: { id: legacy.sub },
          select: { id: true, name: true, email: true, companyId: true },
        }),
      null,
    );
  }

  return null;
}

/**
 * The signed-in HR user's own id and company, or null.
 *
 * Every HR-side action used to take `companyId` as a parameter from the
 * browser. That is not a filter, it is a selector: changing it in devtools
 * returned another company's positions, matched candidates and dashboard
 * counts. `getHRSessionData` even claimed to "re-verify hrUserId belongs to
 * companyId", but both values came from the same localStorage object, so it
 * only checked that the attacker had been internally consistent.
 *
 * The company a request may see is derived here, from the session, and is not
 * something a caller can ask for.
 */
export async function getHRContext(): Promise<{ hrUserId: string; companyId: string } | null> {
  const hrUser = await getCurrentHRUser();
  if (!hrUser) return null;
  return { hrUserId: hrUser.id, companyId: hrUser.companyId };
}

export async function clearLegacySession() {
  const store = await cookies();
  store.delete(LEGACY_COOKIE);
}

// ---------------------------------------------------------------------------
// Linking a Google account to one of our rows
// ---------------------------------------------------------------------------

/**
 * Google returns a display name in one of several metadata fields depending on
 * the account; falls back to the local part of the email rather than leaving
 * the name blank, since the whole UI greets the candidate by name.
 */
function displayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const candidate =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  if (candidate.trim()) return candidate.trim();
  return (user.email ?? "").split("@")[0] || "ผู้ใช้ใหม่";
}

function avatarUrl(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const url =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    "";
  return url || null;
}

/**
 * Matching an OAuth login to a pre-existing row by email address is only safe
 * when the provider actually verified that address. Google does, and Supabase
 * surfaces it as `email_confirmed_at`. Without this check, anyone who could
 * get a provider to issue a token for `someone@else.com` would inherit that
 * candidate's account and their whole assessment history.
 */
function emailIsVerified(user: User): boolean {
  if (user.email_confirmed_at) return true;
  const meta = user.user_metadata ?? {};
  return meta.email_verified === true;
}

export async function linkSupabaseUserToJobSeeker(user: User): Promise<string> {
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error("บัญชี Google นี้ไม่มีอีเมลครับ");

  const existingLink = await prisma.jobSeeker.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (existingLink) return existingLink.id;

  const byEmail = await prisma.jobSeeker.findUnique({
    where: { email },
    select: { id: true, supabaseUserId: true },
  });

  if (byEmail) {
    if (byEmail.supabaseUserId && byEmail.supabaseUserId !== user.id) {
      throw new Error("อีเมลนี้ผูกกับบัญชี Google อื่นอยู่แล้วครับ");
    }
    if (!emailIsVerified(user)) {
      throw new Error("Google ยังไม่ได้ยืนยันอีเมลนี้ครับ เข้าสู่ระบบด้วยรหัสผ่านแทนได้ครับ");
    }
    // An account that already existed with this email — claim it rather than
    // creating a duplicate, so returning candidates keep their game results
    // and profile instead of starting over.
    await prisma.jobSeeker.update({
      where: { id: byEmail.id },
      data: { supabaseUserId: user.id, avatarUrl: avatarUrl(user) },
    });
    return byEmail.id;
  }

  const created = await prisma.jobSeeker.create({
    data: {
      supabaseUserId: user.id,
      email,
      name: displayName(user),
      avatarUrl: avatarUrl(user),
      // No password: this account signs in through Google only. The column is
      // nullable now precisely so we never have to invent one here.
      password: null,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * HR is deliberately stricter than the candidate side: an HRUser must belong
 * to a Company, and we cannot invent one from a Google profile. So a Google
 * sign-in can only *attach to* an HR account that someone already registered,
 * never create one. Anything else would let any Google account become staff at
 * a company by guessing an email domain.
 */
export async function linkSupabaseUserToHRUser(user: User): Promise<string> {
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error("บัญชี Google นี้ไม่มีอีเมลครับ");

  const existingLink = await prisma.hRUser.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (existingLink) return existingLink.id;

  const byEmail = await prisma.hRUser.findUnique({
    where: { email },
    select: { id: true, supabaseUserId: true },
  });

  if (!byEmail) {
    throw new Error(
      "ยังไม่มีบัญชี HR ที่ใช้อีเมลนี้ครับ ให้ลงทะเบียนบริษัทก่อน แล้วค่อยเข้าด้วย Google",
    );
  }
  if (byEmail.supabaseUserId && byEmail.supabaseUserId !== user.id) {
    throw new Error("อีเมลนี้ผูกกับบัญชี Google อื่นอยู่แล้วครับ");
  }
  if (!emailIsVerified(user)) {
    throw new Error("Google ยังไม่ได้ยืนยันอีเมลนี้ครับ");
  }

  await prisma.hRUser.update({
    where: { id: byEmail.id },
    data: { supabaseUserId: user.id },
  });
  return byEmail.id;
}
