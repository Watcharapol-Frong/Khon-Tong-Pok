"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CompanySession, SafeHRUser } from "@/lib/companySession";
import { computeHardSkillScore, computeMatchScore, computeSoftSkillScore } from "@/lib/matching";

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

  let hrUser;
  try {
    hrUser = await prisma.hRUser.findUnique({
      where: { email: normalized },
      include: { company: true },
    });
  } catch (err) {
    console.error("loginHR failed:", err);
    return { error: "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // Same generic message for "no such email" and "wrong password" —
  // distinguishing them lets an attacker enumerate registered emails.
  if (!hrUser || hrUser.password !== password) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const { company, ...rest } = hrUser;
  return { company, hrUser: stripPassword(rest) };
}

// Same 3 skill clusters/position shapes prisma/seed.ts already uses for
// its own test positions — reusing them means the guest company's
// candidates score against requirements the seeded candidate pool was
// actually built to match well against, not arbitrary made-up skills.
const GUEST_POSITION_SPECS: { title: string; requiredHardSkills: string[]; requiredSoftSkills: Record<string, number> }[] = [
  {
    title: "Backend Developer",
    requiredHardSkills: ["Python", "MySQL", "Docker", "Git", "Linux"],
    requiredSoftSkills: { criticalThinking: 60, learningAgility: 55 },
  },
  {
    title: "Marketing Specialist",
    requiredHardSkills: ["Google Analytics", "Facebook", "Google Ads", "Sales and Marketing", "Hootsuite"],
    requiredSoftSkills: { collaborationMindset: 60, criticalThinking: 55 },
  },
  {
    title: "UI/UX Designer",
    requiredHardSkills: ["Adobe Photoshop", "Adobe Illustrator", "Figma", "Adobe InDesign", "Adobe After Effects"],
    requiredSoftSkills: { learningAgility: 60, resilienceAndAdaptability: 55 },
  },
];

/**
 * Populates a freshly-created guest company with real Positions and real
 * scored Matches against the existing candidate pool (seeded test
 * candidates + anyone who's actually registered — never other guest
 * JobSeeker accounts, which have no real profile data to score against),
 * so "กดข้ามได้เลย" lands on a dashboard that already has candidates to
 * look at instead of the empty "post your first job" state. Also seeds a
 * couple of real InterviewSlots (one confirmed, one still pending) on the
 * top-scoring match per position, plus the matching HR notifications, so
 * /company/interviews and the notification bell aren't empty either — same
 * real tables sendInterviewInvite/respondToInterviewInvite write to, just
 * pre-populated instead of requiring the guest to click through the whole
 * flow first. Runs outside createGuestHR's own transaction — a failure
 * here shouldn't roll back an otherwise-successful account creation, just
 * leave the dashboard/interviews emptier than intended.
 */
async function seedPositionsAndMatchesForCompany(companyId: string, hrUserId: string): Promise<void> {
  const candidates = await prisma.jobSeeker.findMany({
    where: { email: { not: { endsWith: "@guest.local" } } },
    include: { chatVerifications: true, gameResult: true },
  });
  if (candidates.length === 0) return;

  for (const [index, spec] of GUEST_POSITION_SPECS.entries()) {
    const position = await prisma.position.create({
      data: {
        companyId,
        title: spec.title,
        requiredHardSkills: spec.requiredHardSkills,
        requiredSoftSkills: spec.requiredSoftSkills,
        status: "open",
      },
    });

    const scored = candidates.map((c) => {
      const hardScore = computeHardSkillScore(spec.requiredHardSkills, c.chatVerifications);
      const softScore = computeSoftSkillScore(spec.requiredSoftSkills, c.gameResult);
      const matchScore = computeMatchScore(hardScore, softScore);
      return { candidate: c, matchScore };
    });

    await prisma.match.createMany({
      data: scored.map(({ candidate, matchScore }) => ({
        positionId: position.id,
        jobSeekerId: candidate.id,
        matchScore,
        isStandout: matchScore >= 90,
        status: "pending",
      })),
    });

    // Top match on the first two positions gets a real InterviewSlot —
    // one already confirmed (so the dashboard/interviews list has
    // something beyond "pending"), one still awaiting the candidate's
    // response. The third position is left with plain pending matches
    // only, so the candidate-list view still shows a real "not yet
    // invited" state too.
    if (index < 2) {
      const top = [...scored].sort((a, b) => b.matchScore - a.matchScore)[0];
      if (top && top.matchScore > 0) {
        const match = await prisma.match.findFirst({
          where: { positionId: position.id, jobSeekerId: top.candidate.id },
        });
        if (match) {
          const isConfirmed = index === 0;
          await prisma.interviewSlot.create({
            data: {
              matchId: match.id,
              proposedTimes: ["2026-09-10 14:00", "2026-09-11 10:00"],
              status: isConfirmed ? "confirmed" : "pending",
              confirmedTime: isConfirmed ? "2026-09-10 14:00" : null,
            },
          });
          if (isConfirmed) {
            await prisma.match.update({ where: { id: match.id }, data: { status: "contacted" } });
            await prisma.notification.create({
              data: {
                hrUserId,
                type: "interview_response",
                message: `${top.candidate.name} ตอบรับคำเชิญสัมภาษณ์สำหรับตำแหน่ง "${spec.title}"`,
                linkUrl: `/company/interviews/${position.id}/${top.candidate.id}`,
              },
            });
          }
        }
      }
    }
  }
}

/**
 * "กดข้ามได้เลย ไม่ต้องกรอกข้อมูล" on /company/login — same fresh-account-
 * per-click approach as JobSeeker's createGuestJobSeeker: a brand new
 * Company + HRUser pair per click (unique @guest.local domain/email), not
 * one shared account, so concurrent visitors get their own isolated
 * dashboard/positions instead of colliding on the same data.
 */
export async function createGuestHR(): Promise<CompanySession | { error: string }> {
  const id = randomUUID();
  try {
    const { company, hrUser } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: "บริษัทตัวอย่าง", domain: `guest-${id}.local` },
      });
      const hrUser = await tx.hRUser.create({
        data: { name: "ผู้เยี่ยมชม", email: `guest-${id}@guest.local`, password: randomUUID(), companyId: company.id },
      });
      return { company, hrUser };
    });

    try {
      await seedPositionsAndMatchesForCompany(company.id, hrUser.id);
    } catch (err) {
      console.error("seedPositionsAndMatchesForCompany failed (guest still created):", err);
    }

    return { company, hrUser: stripPassword(hrUser) };
  } catch (err) {
    console.error("createGuestHR failed:", err);
    return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
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
