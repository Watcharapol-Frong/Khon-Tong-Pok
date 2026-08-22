"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JobSeekerSession, SafeJobSeeker } from "@/lib/jobSeekerSessionContext";

function stripPassword(jobSeeker: {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}): SafeJobSeeker {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from `safe`
  const { password: _password, ...safe } = jobSeeker;
  return safe;
}

function isUniqueConstraintOn(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes(field)
  );
}

export async function registerJobSeeker(
  name: string,
  email: string,
  password: string
): Promise<JobSeekerSession | { error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!name.trim()) return { error: "กรุณากรอกชื่อ-นามสกุล" };
  if (!normalized) return { error: "อีเมลไม่ถูกต้อง" };

  try {
    const jobSeeker = await prisma.jobSeeker.create({
      data: { name: name.trim(), email: normalized, password },
    });
    return { jobSeeker: stripPassword(jobSeeker) };
  } catch (err) {
    if (isUniqueConstraintOn(err, "email")) {
      return { error: "อีเมลนี้ถูกใช้งานแล้ว" };
    }
    console.error("registerJobSeeker failed:", err);
    return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Plaintext password comparison — prototype only, see JobSeeker.password's
 * doc comment in schema.prisma. Real hashing (bcrypt/argon2) is required
 * before this goes anywhere near production.
 */
export async function loginJobSeeker(
  email: string,
  password: string
): Promise<JobSeekerSession | { error: string }> {
  const normalized = email.trim().toLowerCase();
  const jobSeeker = await prisma.jobSeeker.findUnique({ where: { email: normalized } });

  // Same generic message for "no such email" and "wrong password" —
  // distinguishing them lets an attacker enumerate registered emails.
  if (!jobSeeker || jobSeeker.password !== password) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  return { jobSeeker: stripPassword(jobSeeker) };
}

/**
 * Rehydrates a session from the id stored client-side (see
 * src/lib/jobSeekerSession.ts) — called once on mount by JobSeekerAuthGuard.
 */
export async function getJobSeekerSessionData(jobSeekerId: string): Promise<JobSeekerSession | null> {
  const jobSeeker = await prisma.jobSeeker.findUnique({ where: { id: jobSeekerId } });
  if (!jobSeeker) return null;
  return { jobSeeker: stripPassword(jobSeeker) };
}

/**
 * Upserts the logged-in job seeker's ResumeExtraction row. Called by
 * /decoder both after a resume PDF is parsed (rawText provided) and
 * whenever the chat-derived hard-skill union changes (rawText omitted, so
 * the previously-stored resume text — if any — is left untouched). A job
 * seeker who never uploads a resume still gets a row once they surface
 * skills through chat alone, with rawText defaulting to "".
 */
export async function syncResumeExtraction(
  jobSeekerId: string,
  data: { hardSkills: string[]; rawText?: string }
): Promise<{ ok: true } | { error: string }> {
  try {
    await prisma.resumeExtraction.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, hardSkills: data.hardSkills, rawText: data.rawText ?? "" },
      update: {
        hardSkills: data.hardSkills,
        ...(data.rawText !== undefined ? { rawText: data.rawText } : {}),
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("syncResumeExtraction failed:", err);
    return { error: "บันทึกข้อมูลเรซูเม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function getResumeExtraction(jobSeekerId: string) {
  return prisma.resumeExtraction.findUnique({ where: { jobSeekerId } });
}
