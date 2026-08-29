"use server";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { readOrFallback } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { createLegacySession, getCurrentJobSeeker } from "@/lib/auth";
import {
  burnTimeLikeAVerify,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/password";
import { checkRateLimit, clearRateLimit, rateLimitMessage } from "@/lib/rateLimit";
import type { JobSeekerSession, SafeJobSeeker } from "@/lib/jobSeekerSessionContext";

const NOT_SIGNED_IN = "กรุณาเข้าสู่ระบบก่อนครับ";

/**
 * The signed-in candidate's id, or null.
 *
 * EVERY action in this file goes through here, and none of them accept a
 * candidate id as a parameter any more. Removing the parameter outright,
 * rather than accepting and ignoring it, is deliberate: a parameter that looks
 * like it selects a candidate invites the next person to "just pass the id
 * here" and quietly reopens the hole.
 *
 * The reason is that the id used to come from localStorage. `getJobSeekerProfile`,
 * `getGameResult`, `getAISummary` and `generateAIResume` all took it at face
 * value, so editing one value in devtools let anyone read any candidate's
 * profile, psychometric results and AI summary. On a platform whose entire
 * claim is that it controls who sees a candidate's data, that was the whole
 * claim undone — and it was reachable with no tooling beyond the browser's
 * own console.
 */
async function sessionJobSeekerId(): Promise<string | null> {
  const jobSeeker = await getCurrentJobSeeker();
  return jobSeeker?.id ?? null;
}

function stripPassword(jobSeeker: {
  id: string;
  name: string;
  email: string;
  password: string | null;
  createdAt: Date;
}): SafeJobSeeker {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from `safe`
  const { password: _password, ...safe } = jobSeeker;
  return safe as SafeJobSeeker;
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

  if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  try {
    const jobSeeker = await prisma.jobSeeker.create({
      // Hashed before it ever reaches the database. Nothing from here on can
      // read this password back, including us.
      data: { name: name.trim(), email: normalized, password: await hashPassword(password) },
    });
    // Issue the session here rather than letting the client remember an id.
    // Registering is proof of identity for the account just created.
    await createLegacySession(jobSeeker.id, "candidate");
    return { jobSeeker: stripPassword(jobSeeker) };
  } catch (err) {
    if (isUniqueConstraintOn(err, "email")) {
      return { error: "อีเมลนี้ถูกใช้งานแล้ว" };
    }
    console.error("registerJobSeeker failed:", err);
    return { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

const WRONG_CREDENTIALS = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";

/**
 * Sets a signed, httpOnly session cookie on success.
 *
 * Three separate defences, each covering what the others don't:
 *   - the rate limiter caps online guessing
 *   - scrypt makes each guess expensive if the database ever leaks
 *   - the identical error message and matched timing hide which emails exist
 *
 * Rows still holding a plaintext password verify against it and are rehashed
 * immediately, so accounts convert as their owners log in rather than everyone
 * being locked out at once. `npm run db:hash-passwords` converts the rest
 * without waiting.
 */
export async function loginJobSeeker(
  email: string,
  password: string
): Promise<JobSeekerSession | { error: string }> {
  const normalized = email.trim().toLowerCase();

  // Counted before the lookup, not after a failure: a limiter that only counts
  // failures still lets an attacker measure response timing on every attempt.
  const key = `login:candidate:${normalized}`;
  const limit = checkRateLimit(key);
  if (!limit.allowed) return { error: rateLimitMessage(limit.retryAfterSec) };

  const jobSeeker = await prisma.jobSeeker.findUnique({ where: { email: normalized } });

  if (!jobSeeker) {
    // Spend the same time a real verify would. Returning instantly here is what
    // turns one identical error message into a working email-enumeration oracle.
    await burnTimeLikeAVerify();
    return { error: WRONG_CREDENTIALS };
  }

  // A Google-only account has no password at all. Saying so is safe — it tells
  // an attacker nothing they couldn't learn by trying to sign in with Google —
  // and without it the owner gets "wrong password" for one they never set.
  if (jobSeeker.password === null) {
    return { error: "บัญชีนี้สมัครผ่าน Google ครับ กดปุ่ม \"เข้าสู่ระบบด้วย Google\" ด้านล่างได้เลย" };
  }

  if (!(await verifyPassword(password, jobSeeker.password))) {
    return { error: WRONG_CREDENTIALS };
  }

  if (needsRehash(jobSeeker.password)) {
    await prisma.jobSeeker.update({
      where: { id: jobSeeker.id },
      data: { password: await hashPassword(password) },
    });
  }

  clearRateLimit(key);
  await createLegacySession(jobSeeker.id, "candidate");
  return { jobSeeker: stripPassword(jobSeeker) };
}

/**
 * The signed-in candidate — resolved entirely from the session cookie or the
 * Supabase Auth session. Takes no argument by design: there is nothing the
 * caller could pass that would be safe to believe.
 */
export async function getJobSeekerSessionData(): Promise<JobSeekerSession | null> {
  const current = await getCurrentJobSeeker();
  if (!current) return null;

  // The guard calls this on every protected page, so a database blip here is
  // what turns into a full-screen crash. Degrade to "signed out" instead.
  const jobSeeker = await readOrFallback(
    () => prisma.jobSeeker.findUnique({ where: { id: current.id } }),
    null,
  );
  if (!jobSeeker) return null;
  return { jobSeeker: stripPassword(jobSeeker) };
}

/** Lets client components ask "is anyone signed in?" without holding an id. */
export async function getSignedInJobSeekerId(): Promise<string | null> {
  return sessionJobSeekerId();
}

/**
 * Upserts just the computer-skills + resume-text portion of the job
 * seeker's profile. Called by /decoder both after a resume PDF is parsed
 * (resumeRawText provided) and whenever the chat-derived hard-skill union
 * changes (resumeRawText omitted, so whatever resume text is already on
 * record is left untouched). A candidate who never uploads a resume still
 * gets a profile row once they surface skills through chat alone, with
 * resumeRawText defaulting to "". Distinct from saveProfileSkills below,
 * which is the manual 4-step form's own step 4 save (also touches
 * languageSkills, never touches resumeRawText).
 */
export async function syncComputerSkills(
  data: { computerSkills: string[]; resumeRawText?: string }
): Promise<{ ok: true } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  try {
    await prisma.jobSeekerProfile.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, computerSkills: data.computerSkills, resumeRawText: data.resumeRawText ?? "" },
      update: {
        computerSkills: data.computerSkills,
        ...(data.resumeRawText !== undefined ? { resumeRawText: data.resumeRawText } : {}),
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("syncComputerSkills failed:", err);
    return { error: "บันทึกข้อมูลทักษะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

/** Full profile with all repeatable sections, ordered for display — null if the candidate hasn't started the manual form or uploaded a resume yet. */
export async function getJobSeekerProfile() {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return null;
  return prisma.jobSeekerProfile.findUnique({
    where: { jobSeekerId },
    include: {
      education: { orderBy: { sortOrder: "asc" } },
      workExperience: { orderBy: { sortOrder: "asc" } },
      languageSkills: true,
      certificates: true,
    },
  });
}

/** null if the candidate hasn't played the psychometric games yet — real gameplay isn't wired up yet, so this is only non-null for seeded test candidates until that lands. */
export async function getGameResult() {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return null;
  return prisma.gameResult.findUnique({ where: { jobSeekerId } });
}

export type ProfileStep1Input = {
  firstNameTh?: string;
  lastNameTh?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  birthDate?: string; // ISO date string ("YYYY-MM-DD") from a date input
  gender?: string;
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  address?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  militaryStatus?: string;
  desiredPosition?: string;
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  desiredJobType?: string;
  desiredProvince?: string;
  availableDate?: string;
};

function toDateOrUndefined(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Step 1 of the manual form (ข้อมูลส่วนตัว + ลักษณะงานที่ต้องการ) — always the first step, so it's the one that creates the JobSeekerProfile row that steps 2-4 then attach child rows to. */
export async function saveProfileStep1(
  data: ProfileStep1Input
): Promise<{ ok: true } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  try {
    const fields = {
      firstNameTh: data.firstNameTh,
      lastNameTh: data.lastNameTh,
      firstNameEn: data.firstNameEn,
      lastNameEn: data.lastNameEn,
      birthDate: toDateOrUndefined(data.birthDate),
      gender: data.gender,
      nationality: data.nationality,
      religion: data.religion,
      maritalStatus: data.maritalStatus,
      address: data.address,
      province: data.province,
      postalCode: data.postalCode,
      phone: data.phone,
      militaryStatus: data.militaryStatus,
      desiredPosition: data.desiredPosition,
      desiredSalaryMin: data.desiredSalaryMin,
      desiredSalaryMax: data.desiredSalaryMax,
      desiredJobType: data.desiredJobType,
      desiredProvince: data.desiredProvince,
      availableDate: toDateOrUndefined(data.availableDate),
    };
    await prisma.jobSeekerProfile.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, ...fields },
      update: fields,
    });
    return { ok: true };
  } catch (err) {
    console.error("saveProfileStep1 failed:", err);
    return { error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

async function requireProfileId(jobSeekerId: string): Promise<string | { error: string }> {
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { jobSeekerId } });
  if (!profile) return { error: "กรุณากรอกข้อมูลส่วนตัว (ขั้นตอนที่ 1) ก่อน" };
  return profile.id;
}

export type EducationInput = {
  level: string;
  institution: string;
  fieldOfStudy?: string;
  gpa?: number;
  startYear?: number;
  endYear?: number;
};

/** Step 2 — replace-all: the client always resubmits the whole list (add/remove/reorder happen in local state), so deleting and recreating is simpler and just as correct as diffing row-by-row. */
export async function saveProfileEducation(
  entries: EducationInput[]
): Promise<{ ok: true } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  const profileId = await requireProfileId(jobSeekerId);
  if (typeof profileId !== "string") return profileId;
  try {
    await prisma.$transaction([
      prisma.educationEntry.deleteMany({ where: { profileId } }),
      prisma.educationEntry.createMany({
        data: entries.map((e, i) => ({ ...e, profileId, sortOrder: i })),
      }),
    ]);
    return { ok: true };
  } catch (err) {
    console.error("saveProfileEducation failed:", err);
    return { error: "บันทึกประวัติการศึกษาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export type WorkExperienceInput = {
  companyName: string;
  jobTitle: string;
  responsibilities?: string;
  salary?: number;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
};

/** Step 3 — same replace-all reasoning as saveProfileEducation. */
export async function saveProfileWorkExperience(
  entries: WorkExperienceInput[]
): Promise<{ ok: true } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  const profileId = await requireProfileId(jobSeekerId);
  if (typeof profileId !== "string") return profileId;
  try {
    await prisma.$transaction([
      prisma.workExperienceEntry.deleteMany({ where: { profileId } }),
      prisma.workExperienceEntry.createMany({
        data: entries.map((e, i) => ({
          companyName: e.companyName,
          jobTitle: e.jobTitle,
          responsibilities: e.responsibilities,
          salary: e.salary,
          startDate: toDateOrUndefined(e.startDate),
          endDate: toDateOrUndefined(e.endDate),
          isCurrent: e.isCurrent ?? false,
          profileId,
          sortOrder: i,
        })),
      }),
    ]);
    return { ok: true };
  } catch (err) {
    console.error("saveProfileWorkExperience failed:", err);
    return { error: "บันทึกประสบการณ์ทำงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export type LanguageSkillInput = {
  language: string;
  speaking?: string;
  reading?: string;
  writing?: string;
};

/** Step 4 — computer skills (dictionary-only, via SkillAutocomplete) + language skills (replace-all, same reasoning as education/work experience). */
export async function saveProfileSkills(
  data: { computerSkills: string[]; languageSkills: LanguageSkillInput[] }
): Promise<{ ok: true } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  try {
    const profile = await prisma.jobSeekerProfile.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, computerSkills: data.computerSkills },
      update: { computerSkills: data.computerSkills },
    });
    await prisma.$transaction([
      prisma.languageSkillEntry.deleteMany({ where: { profileId: profile.id } }),
      prisma.languageSkillEntry.createMany({
        data: data.languageSkills.map((l) => ({ ...l, profileId: profile.id })),
      }),
    ]);
    return { ok: true };
  } catch (err) {
    console.error("saveProfileSkills failed:", err);
    return { error: "บันทึกทักษะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * What a returning candidate should see on login — used by /login right
 * after a successful loginJobSeeker to decide the welcome message and
 * where to send them next (never re-run the game/onboarding flow, which
 * has no completion gate of its own; see markChatFlowComplete below for
 * what "complete" means).
 */
export async function getJobSeekerReturnState(): Promise<{ hasHardSkills: boolean; isComplete: boolean }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { hasHardSkills: false, isComplete: false };
  const [profile, aiSummary] = await Promise.all([
    prisma.jobSeekerProfile.findUnique({ where: { jobSeekerId } }),
    prisma.aISummary.findUnique({ where: { jobSeekerId } }),
  ]);
  return {
    hasHardSkills: (profile?.computerSkills.length ?? 0) > 0,
    isComplete: aiSummary !== null,
  };
}

/**
 * Marks the candidate's Smart Profile as complete — called once by
 * /decoder when the 3-turn STAR flow finishes. Not a real Gemini-generated
 * synthesis (that's a separate feature); summaryText here is a simple
 * template just so this row can exist as a genuine, persisted "done"
 * signal for getJobSeekerReturnState above, rather than routing decisions
 * depending on client-only state that resets on every page load.
 */
export async function markChatFlowComplete(
  hardSkills: string[]
): Promise<{ ok: true } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  try {
    const summaryText = `สรุปโปรไฟล์เบื้องต้น: มีทักษะที่ยืนยันแล้ว ${hardSkills.length} รายการ (${hardSkills.join(", ")})`;
    const sourceHash = createHash("sha256").update(JSON.stringify(hardSkills)).digest("hex");
    await prisma.aISummary.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, summaryText, sourceHash },
      update: { summaryText, sourceHash, generatedAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    console.error("markChatFlowComplete failed:", err);
    return { error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

/** Whatever's currently on record — either markChatFlowComplete's basic template or generateAIResume's real Gemini narrative below, whichever ran most recently. Used by /profile to show something instead of nothing once either has ever run. */
export async function getAISummary() {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return null;
  return prisma.aISummary.findUnique({ where: { jobSeekerId } });
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function formatProfileForPrompt(
  profile: NonNullable<Awaited<ReturnType<typeof getJobSeekerProfile>>>,
  name: string
): string {
  const lines: string[] = [`ชื่อ: ${name}`];
  if (profile.desiredPosition) lines.push(`ตำแหน่งงานที่สนใจ: ${profile.desiredPosition}`);
  if (profile.education.length > 0) {
    // ส่งเฉพาะ "ระดับ" การศึกษา ไม่ส่งชื่อสถาบันและสาขา
    //
    // สรุปที่ได้จากตรงนี้ไปโผล่ที่หน้า company/candidates/[id] ซึ่ง HR อ่าน
    // ถ้าปล่อยชื่อมหาวิทยาลัยกับสาขาเข้า prompt มันจะไหลออกมาในสรุปนั้นได้
    // = ทำลายข้อตกลงเรื่องซ่อนสถาบันเพื่อลดอคติ ซึ่งเป็นแกนหลักของทั้งโปรเจกต์
    //
    // "ปริญญาตรี" อย่างเดียวไม่ใช่สัญญาณอคติ เก็บไว้ได้ แต่ชื่อสถาบันกับสาขา
    // เป็นสองในห้าอย่างที่ทีมโหวตกันว่าต้องซ่อน (พร้อม GPA อายุ เพศ)
    lines.push(
      "ระดับการศึกษา:",
      ...profile.education.map((e) => `- ${e.level}`)
    );
  }
  if (profile.workExperience.length > 0) {
    lines.push(
      "ประสบการณ์ทำงาน:",
      ...profile.workExperience.map(
        (w) =>
          `- ${w.jobTitle} ที่ ${w.companyName}${w.isCurrent ? " (ปัจจุบัน)" : ""}${
            w.responsibilities ? `: ${w.responsibilities}` : ""
          }`
      )
    );
  }
  if (profile.computerSkills.length > 0) {
    lines.push(`ทักษะคอมพิวเตอร์/โปรแกรม: ${profile.computerSkills.join(", ")}`);
  }
  if (profile.languageSkills.length > 0) {
    lines.push(`ทักษะภาษา: ${profile.languageSkills.map((l) => l.language).join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * The "ให้น้องตรงปกช่วยสร้าง" (Premium-badged) resume feature — asks
 * Gemini to turn the candidate's structured profile into a short narrative
 * summary instead of a raw data dump. Deliberately does NOT include
 * soft-skill/game data: GameResult isn't wired to real per-candidate data
 * yet (still the same static mock every /profile visitor sees), so folding
 * it in here would present fabricated numbers as if they were real. Reuses
 * the AISummary row markChatFlowComplete creates — this replaces that
 * basic template with the real generated narrative once the candidate asks
 * for it, rather than keeping two separate "summary" records.
 */
export async function generateAIResume(): Promise<{ summaryText: string } | { error: string }> {
  // ตัวตนมาจาก session ที่เซิร์ฟเวอร์ตรวจแล้วเท่านั้น
  // ไม่ใช่ id ที่ client ส่งมา (ดูเหตุผลเต็มใน src/lib/auth.ts)
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  const [profile, jobSeeker] = await Promise.all([
    getJobSeekerProfile(),
    prisma.jobSeeker.findUnique({ where: { id: jobSeekerId } }),
  ]);
  if (!jobSeeker) return { error: "ไม่พบผู้ใช้" };
  if (!profile || (profile.computerSkills.length === 0 && profile.workExperience.length === 0 && profile.education.length === 0)) {
    return { error: "กรุณากรอกข้อมูลโปรไฟล์หรืออัปโหลดเรซูเม่ก่อน จึงจะให้น้องตรงปกช่วยสร้างได้" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "ระบบ AI ยังไม่พร้อมใช้งานในขณะนี้ (ไม่ได้ตั้งค่า API key) กรุณาลองใหม่ภายหลัง" };
  }

  const prompt = `คุณคือ "น้องตรงปก" ผู้ช่วยเขียน Resume ให้ผู้สมัครงาน เพศชาย ภาษาไทย
เขียนสรุปโปรไฟล์ผู้สมัคร (professional summary) ความยาว 3-5 ประโยค ที่เชื่อมโยงข้อมูลด้านล่างให้เป็นเรื่องราวที่เป็นธรรมชาติ ไม่ใช่แค่ list ข้อมูลดิบทีละบรรทัด — เน้นบอกว่าผู้สมัครคนนี้ "เป็นใคร" (จุดแข็ง ทิศทางอาชีพ) ไม่ใช่แค่ "ทำอะไรมา"
ห้ามใส่ข้อมูลที่ไม่ได้ให้มาด้านล่างนี้ (ห้ามเดาหรือแต่งเพิ่ม) น้ำเสียงมืออาชีพแต่อบอุ่น
ห้ามกล่าวถึงชื่อมหาวิทยาลัย/สถาบัน สาขาวิชา เกรดเฉลี่ย อายุ หรือเพศ เด็ดขาด แม้จะเดาได้จากข้อมูลอื่นก็ตาม
(สรุปนี้ HR เป็นคนอ่าน แพลตฟอร์มออกแบบให้ประเมินจากทักษะล้วนๆ เพื่อลดอคติ)
ใช้คำลงท้ายประโยคว่า "ครับ" เท่านั้น ห้ามใช้ "ค่ะ", "คะ", หรือคำลงท้ายเพศหญิงอื่นๆ เด็ดขาด (ให้บุคลิกของน้องตรงปกสม่ำเสมอกับส่วนอื่นของแอป)

ข้อมูลผู้สมัคร:
${formatProfileForPrompt(profile, jobSeeker.name)}`;

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: { summaryText: { type: "string" } },
            required: ["summaryText"],
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("generateAIResume: Gemini API error", geminiRes.status, errText);
      return { error: "น้องตรงปกสร้าง Resume ไม่สำเร็จในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
    }

    const data = await geminiRes.json();
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error("generateAIResume: Gemini returned an empty response", data);
      return { error: "น้องตรงปกสร้าง Resume ไม่สำเร็จในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
    }

    const parsed: { summaryText?: unknown } = JSON.parse(rawText);
    const summaryText = typeof parsed.summaryText === "string" ? parsed.summaryText.trim() : "";
    if (!summaryText) {
      return { error: "น้องตรงปกสร้าง Resume ไม่สำเร็จในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
    }

    const sourceHash = createHash("sha256").update(JSON.stringify(profile)).digest("hex");
    await prisma.aISummary.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, summaryText, sourceHash },
      update: { summaryText, sourceHash, generatedAt: new Date() },
    });

    return { summaryText };
  } catch (err) {
    console.error("generateAIResume failed:", err);
    return { error: "น้องตรงปกสร้าง Resume ไม่สำเร็จในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
  }
}
