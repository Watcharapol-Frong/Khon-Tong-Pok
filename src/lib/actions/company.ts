"use server";

import { Prisma } from "@prisma/client";
import { readOrFallback } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { createLegacySession, getCurrentHRUser } from "@/lib/auth";
import {
  burnTimeLikeAVerify,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/password";
import { checkRateLimit, clearRateLimit, rateLimitMessage } from "@/lib/rateLimit";
import type { CompanySession, SafeHRUser } from "@/lib/companySession";

function stripPassword(hrUser: {
  id: string;
  name: string;
  email: string;
  companyId: string;
  // Nullable since Google-only HR accounts have no password, and carried
  // through so the returned object still satisfies Omit<HRUser, "password">.
  password: string | null;
  supabaseUserId: string | null;
}): SafeHRUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from `safe`
  const { password: _password, ...safe } = hrUser;
  return safe;
}

function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

function isUniqueConstraintOn(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes(field)
  );
}

/** Looks up the Company whose domain matches the email's domain — used by /company/register to decide "join existing" vs. "create new" before the candidate picks a path. Returns null for both "no domain in the email" and "no matching company", since the caller treats both the same way (offer to create a new company). */
export async function checkCompanyByDomain(email: string) {
  const domain = emailDomain(email);
  if (!domain) return null;
  return prisma.company.findUnique({ where: { domain } });
}

export async function createCompany(input: {
  name: string;
  domain: string;
  hrName: string;
  hrEmail: string;
  password: string;
}): Promise<CompanySession | { error: string }> {
  const domain = input.domain.trim().toLowerCase();
  const email = input.hrEmail.trim().toLowerCase();
  if (!domain) return { error: "อีเมลไม่ถูกต้อง" };
  if (!input.name.trim()) return { error: "กรุณากรอกชื่อบริษัท" };
  if (input.password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  // Hashed outside the transaction: scrypt deliberately takes ~100ms, and
  // holding a database transaction open across it invites pool exhaustion.
  const hashed = await hashPassword(input.password);

  try {
    // Explicit transaction (not just a nested write) so a failure creating
    // the HRUser can't leave an orphaned Company with nobody able to log
    // into it.
    const { company, hrUser } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: input.name.trim(), domain },
      });
      const hrUser = await tx.hRUser.create({
        data: { name: input.hrName.trim(), email, password: hashed, companyId: company.id },
      });
      return { company, hrUser };
    });
    // Issue the session server-side. Previously the browser was handed the ids
    // and told to remember them, which made the ids themselves the credential.
    await createLegacySession(hrUser.id, "hr");
    return { company, hrUser: stripPassword(hrUser) };
  } catch (err) {
    if (isUniqueConstraintOn(err, "domain")) {
      return { error: "โดเมนอีเมลนี้มีบริษัทลงทะเบียนไว้แล้ว ลองเข้าร่วมบริษัทเดิมแทน" };
    }
    if (isUniqueConstraintOn(err, "email")) {
      return { error: "อีเมลนี้ถูกใช้งานแล้ว" };
    }
    console.error("createCompany failed:", err);
    return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function joinExistingCompany(input: {
  companyId: string;
  hrName: string;
  hrEmail: string;
  password: string;
}): Promise<CompanySession | { error: string }> {
  const email = input.hrEmail.trim().toLowerCase();
  if (input.password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  const hashed = await hashPassword(input.password);

  try {
    const [company, hrUser] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: input.companyId } }),
      prisma.hRUser.create({
        data: { name: input.hrName.trim(), email, password: hashed, companyId: input.companyId },
      }),
    ]);
    await createLegacySession(hrUser.id, "hr");
    return { company, hrUser: stripPassword(hrUser) };
  } catch (err) {
    if (isUniqueConstraintOn(err, "email")) {
      return { error: "อีเมลนี้ถูกใช้งานแล้ว" };
    }
    console.error("joinExistingCompany failed:", err);
    return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Plaintext password comparison — prototype only, see HRUser.password's doc
 * comment in schema.prisma. Real hashing (bcrypt/argon2) is required before
 * this goes anywhere near production.
 */
export async function loginHR(email: string, password: string): Promise<CompanySession | { error: string }> {
  const normalized = email.trim().toLowerCase();

  const key = `login:hr:${normalized}`;
  const limit = checkRateLimit(key);
  if (!limit.allowed) return { error: rateLimitMessage(limit.retryAfterSec) };

  const hrUser = await prisma.hRUser.findUnique({
    where: { email: normalized },
    include: { company: true },
  });

  if (!hrUser) {
    // Matches the cost of a real verify, so response time doesn't reveal which
    // company emails have HR accounts.
    await burnTimeLikeAVerify();
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // A Google-only HR account has no password stored at all.
  if (hrUser.password === null) {
    return { error: "บัญชีนี้เข้าผ่าน Google ครับ กดปุ่มเข้าสู่ระบบด้วย Google ด้านล่าง" };
  }

  if (!(await verifyPassword(password, hrUser.password))) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // Converts a leftover plaintext row the moment its owner logs in.
  if (needsRehash(hrUser.password)) {
    await prisma.hRUser.update({
      where: { id: hrUser.id },
      data: { password: await hashPassword(password) },
    });
  }

  clearRateLimit(key);
  await createLegacySession(hrUser.id, "hr");
  const { company, ...rest } = hrUser;
  return { company, hrUser: stripPassword(rest) };
}

/**
 * The signed-in HR user and their company — called once on mount by
 * CompanyAppLayout.
 *
 * Takes no arguments now. It used to accept `(hrUserId, companyId)` from
 * localStorage and "verify" that the first belonged to the second, but both
 * values came out of the same client-controlled object, so that check only
 * confirmed the caller had been consistent with themselves. Swapping in
 * another company's pair of ids logged you in as their HR.
 */
export async function getHRSessionData(): Promise<CompanySession | null> {
  const current = await getCurrentHRUser();
  if (!current) return null;

  const hrUser = await readOrFallback(
    () =>
      prisma.hRUser.findUnique({
        where: { id: current.id },
        include: { company: true },
      }),
    null,
  );
  if (!hrUser) return null;

  const { company, ...rest } = hrUser;
  return { company, hrUser: stripPassword(rest) };
}

/** The company the signed-in HR user belongs to — null when nobody is signed in. */
export async function getSignedInCompanyId(): Promise<string | null> {
  const current = await getCurrentHRUser();
  return current?.companyId ?? null;
}
