"use server";

import { createHash } from "node:crypto";
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
  jobSeekerId: string,
  data: { computerSkills: string[]; resumeRawText?: string }
): Promise<{ ok: true } | { error: string }> {
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
export async function getJobSeekerProfile(jobSeekerId: string) {
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
export async function getGameResult(jobSeekerId: string) {
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
  jobSeekerId: string,
  data: ProfileStep1Input
): Promise<{ ok: true } | { error: string }> {
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
  jobSeekerId: string,
  entries: EducationInput[]
): Promise<{ ok: true } | { error: string }> {
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
  jobSeekerId: string,
  entries: WorkExperienceInput[]
): Promise<{ ok: true } | { error: string }> {
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
  jobSeekerId: string,
  data: { computerSkills: string[]; languageSkills: LanguageSkillInput[] }
): Promise<{ ok: true } | { error: string }> {
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
export async function getJobSeekerReturnState(
  jobSeekerId: string
): Promise<{ hasHardSkills: boolean; isComplete: boolean }> {
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
  jobSeekerId: string,
  hardSkills: string[]
): Promise<{ ok: true } | { error: string }> {
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
export async function getAISummary(jobSeekerId: string) {
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
    lines.push(
      "ประวัติการศึกษา:",
      ...profile.education.map(
        (e) => `- ${e.level} ${e.institution}${e.fieldOfStudy ? ` สาขา${e.fieldOfStudy}` : ""}`
      )
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
export async function generateAIResume(jobSeekerId: string): Promise<{ summaryText: string } | { error: string }> {
  const [profile, jobSeeker] = await Promise.all([
    getJobSeekerProfile(jobSeekerId),
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
