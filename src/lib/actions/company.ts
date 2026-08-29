"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CompanySession, SafeHRUser } from "@/lib/companySession";

function stripPassword(hrUser: { id: string; name: string; email: string; companyId: string; password: string }): SafeHRUser {
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

  try {
    // Explicit transaction (not just a nested write) so a failure creating
    // the HRUser can't leave an orphaned Company with nobody able to log
    // into it.
    const { company, hrUser } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: input.name.trim(), domain },
      });
      const hrUser = await tx.hRUser.create({
        data: { name: input.hrName.trim(), email, password: input.password, companyId: company.id },
      });
      return { company, hrUser };
    });
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
  try {
    const [company, hrUser] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: input.companyId } }),
      prisma.hRUser.create({
        data: { name: input.hrName.trim(), email, password: input.password, companyId: input.companyId },
      }),
    ]);
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
  const hrUser = await prisma.hRUser.findUnique({
    where: { email: normalized },
    include: { company: true },
  });

  // Same generic message for "no such email" and "wrong password" —
  // distinguishing them lets an attacker enumerate registered emails.
  if (!hrUser || hrUser.password !== password) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const { company, ...rest } = hrUser;
  return { company, hrUser: stripPassword(rest) };
}

/**
 * Rehydrates a session from the two ids stored client-side (see
 * src/lib/hrSession.ts) — called once on mount by CompanyAppLayout. Confirms
 * hrUserId actually belongs to companyId (not just that both ids
 * individually exist) so a tampered/mismatched localStorage value can't
 * grant access to the wrong company's data.
 */
export async function getHRSessionData(hrUserId: string, companyId: string): Promise<CompanySession | null> {
  const hrUser = await prisma.hRUser.findUnique({
    where: { id: hrUserId },
    include: { company: true },
  });
  if (!hrUser || hrUser.companyId !== companyId) return null;

  const { company, ...rest } = hrUser;
  return { company, hrUser: stripPassword(rest) };
}
