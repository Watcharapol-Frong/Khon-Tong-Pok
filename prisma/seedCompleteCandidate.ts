/**
 * Seeds exactly ONE JobSeeker with every field genuinely filled in — full
 * personal info, education, work experience, languages, certificates,
 * verified hard skills, a real GameResult, a real Gemini AI Summary, a real
 * generated resume PDF, a real Gemini resume-gap analysis, and Matches (one
 * with a confirmed interview, so it's already unblinded on the HR side
 * too) — a reference candidate for
 * reviewing/adjusting the candidate-facing and HR-facing UI against
 * something fully populated, instead of the sparser [TEST] candidates from
 * prisma/seed.ts.
 *
 * Idempotent: deletes and recreates this one candidate every run, so it's
 * safe to re-run after schema/logic changes. NOT swept up by
 * `db:seed:clean` — different email domain/no "[TEST]" prefix on purpose,
 * so it survives that script's cleanup and stays a stable reference.
 *
 * Run with: npx tsx prisma/seedCompleteCandidate.ts
 *
 * Login: complete.demo@example.com / demo1234
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { computeHardSkillScore, computeMatchScore, computeSoftSkillScore } from "../src/lib/matching";
import { generateAIResume, generateResumeGapAnalysis } from "../src/lib/actions/jobSeeker";
import { generateResumePdfFromProfile } from "../src/lib/actions/resumeFile";

const prisma = new PrismaClient();

const EMAIL = "complete.demo@example.com";
const PASSWORD = "demo1234";
const NAME = "ณัฐวุฒิ เพชรรุ่งเรือง";

const COMPUTER_SKILLS = ["Python", "MySQL", "Docker", "Git", "JavaScript", "Node.js", "Linux", "Kubernetes"];

async function cleanPrevious() {
  const existing = await prisma.jobSeeker.findUnique({ where: { email: EMAIL } });
  if (!existing) return;

  const matches = await prisma.match.findMany({ where: { jobSeekerId: existing.id }, select: { id: true } });
  const matchIds = matches.map((m) => m.id);
  await prisma.interviewSlot.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.match.deleteMany({ where: { jobSeekerId: existing.id } });

  const profile = await prisma.jobSeekerProfile.findUnique({ where: { jobSeekerId: existing.id } });
  if (profile) {
    await prisma.educationEntry.deleteMany({ where: { profileId: profile.id } });
    await prisma.workExperienceEntry.deleteMany({ where: { profileId: profile.id } });
    await prisma.languageSkillEntry.deleteMany({ where: { profileId: profile.id } });
    await prisma.certificateEntry.deleteMany({ where: { profileId: profile.id } });
    await prisma.jobSeekerProfile.delete({ where: { jobSeekerId: existing.id } });
  }

  await prisma.chatVerification.deleteMany({ where: { jobSeekerId: existing.id } });
  await prisma.gameResult.deleteMany({ where: { jobSeekerId: existing.id } });
  await prisma.aISummary.deleteMany({ where: { jobSeekerId: existing.id } });
  await prisma.resumeGapAnalysis.deleteMany({ where: { jobSeekerId: existing.id } });
  await prisma.jobSeeker.delete({ where: { id: existing.id } });
  console.log("Removed previous complete-demo candidate.");
}

async function main() {
  await cleanPrevious();

  const jobSeeker = await prisma.jobSeeker.create({
    data: { name: NAME, email: EMAIL, password: PASSWORD },
  });
  console.log(`Created JobSeeker ${jobSeeker.id} (${EMAIL} / ${PASSWORD})`);

  const profile = await prisma.jobSeekerProfile.create({
    data: {
      jobSeekerId: jobSeeker.id,
      firstNameTh: "ณัฐวุฒิ",
      lastNameTh: "เพชรรุ่งเรือง",
      firstNameEn: "Nattawut",
      lastNameEn: "Petcharungruang",
      birthDate: new Date("1998-05-14"),
      gender: "ชาย",
      nationality: "ไทย",
      religion: "พุทธ",
      maritalStatus: "โสด",
      address: "123/45 ถนนสุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา",
      province: "กรุงเทพมหานคร",
      postalCode: "10110",
      phone: "0891234567",
      militaryStatus: "ผ่านการเกณฑ์ทหารแล้ว",
      desiredPosition: "Backend Developer",
      desiredSalaryMin: 35000,
      desiredSalaryMax: 50000,
      desiredJobType: "งานประจำ",
      desiredProvince: "กรุงเทพมหานคร",
      availableDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      computerSkills: COMPUTER_SKILLS,
      resumeRawText:
        "Backend Developer ที่มีประสบการณ์ 3+ ปีในการพัฒนา REST API ด้วย Python/Django และ Node.js ถนัดออกแบบฐานข้อมูล MySQL และดูแลระบบผ่าน Docker/Kubernetes มีพื้นฐานวิศวกรรมคอมพิวเตอร์จากจุฬาลงกรณ์มหาวิทยาลัย",
    },
  });

  await prisma.educationEntry.createMany({
    data: [
      {
        profileId: profile.id,
        level: "ปริญญาตรี",
        institution: "จุฬาลงกรณ์มหาวิทยาลัย",
        fieldOfStudy: "วิศวกรรมคอมพิวเตอร์",
        gpa: 3.45,
        startYear: 2016,
        endYear: 2020,
        sortOrder: 0,
      },
      {
        profileId: profile.id,
        level: "มัธยมศึกษาตอนปลาย",
        institution: "โรงเรียนเตรียมอุดมศึกษา",
        fieldOfStudy: "วิทย์-คณิต",
        gpa: 3.8,
        startYear: 2013,
        endYear: 2016,
        sortOrder: 1,
      },
    ],
  });

  await prisma.workExperienceEntry.createMany({
    data: [
      {
        profileId: profile.id,
        companyName: "บริษัท เทคสตาร์ท จำกัด",
        jobTitle: "Backend Developer",
        responsibilities: "พัฒนาและดูแล REST API ด้วย Python/Django ออกแบบฐานข้อมูล MySQL และดูแล deployment บน Docker/Kubernetes",
        salary: 38000,
        startDate: new Date("2022-03-01"),
        isCurrent: true,
        sortOrder: 0,
      },
      {
        profileId: profile.id,
        companyName: "บริษัท ดิจิทัล โซลูชั่น จำกัด",
        jobTitle: "Junior Software Engineer",
        responsibilities: "พัฒนา Web Application ด้วย Node.js และ React ร่วมทีม Scrum",
        salary: 28000,
        startDate: new Date("2020-07-01"),
        endDate: new Date("2022-02-28"),
        isCurrent: false,
        sortOrder: 1,
      },
    ],
  });

  await prisma.languageSkillEntry.createMany({
    data: [
      { profileId: profile.id, language: "อังกฤษ", speaking: "ดี", reading: "ดีมาก", writing: "ดี" },
      { profileId: profile.id, language: "ไทย", speaking: "เจ้าของภาษา", reading: "เจ้าของภาษา", writing: "เจ้าของภาษา" },
    ],
  });

  await prisma.certificateEntry.createMany({
    data: [
      {
        profileId: profile.id,
        title: "AWS Certified Developer – Associate",
        issuer: "Amazon Web Services",
        issueDate: new Date("2023-06-01"),
      },
      {
        profileId: profile.id,
        title: "Google Data Analytics Professional Certificate",
        issuer: "Google",
        issueDate: new Date("2022-11-01"),
      },
    ],
  });

  const skillVerifications = COMPUTER_SKILLS.map((skill, i) => ({
    skill,
    status: i < 6 ? "verified" : "partial",
  }));
  for (const v of skillVerifications) {
    await prisma.chatVerification.create({
      data: {
        jobSeekerId: jobSeeker.id,
        skill: v.skill,
        status: v.status,
        conversationLog: [{ role: "system", text: "auto-generated verification for complete-demo candidate" }],
      },
    });
  }

  const axisScores = {
    riskTolerance: 68,
    learningAgility: 82,
    criticalThinking: 79,
    decisionMakingUnderPressure: 71,
    collaborationMindset: 75,
    resilienceAndAdaptability: 66,
  };
  const overallIndex = Math.round(
    Object.values(axisScores).reduce((sum, v) => sum + v, 0) / Object.values(axisScores).length,
  );
  await prisma.gameResult.create({ data: { jobSeekerId: jobSeeker.id, ...axisScores, overallIndex } });
  console.log("Created full profile, education, work experience, languages, certificates, GameResult.");

  const positions = await prisma.position.findMany({ where: { status: "open" } });
  let interviewGiven = false;
  for (const position of positions) {
    const hardScore = computeHardSkillScore(position.requiredHardSkills, skillVerifications);
    const softScore = computeSoftSkillScore(position.requiredSoftSkills as Record<string, number>, axisScores);
    const matchScore = computeMatchScore(hardScore, softScore);

    const match = await prisma.match.create({
      data: {
        positionId: position.id,
        jobSeekerId: jobSeeker.id,
        matchScore,
        isStandout: matchScore >= 90,
        status: !interviewGiven && matchScore >= 50 ? "contacted" : "pending",
      },
    });

    // Give the single best/first eligible match a confirmed interview so
    // the HR side is already unblinded for at least one position without
    // extra manual steps — same real flow (sendInterviewInvite →
    // respondToInterviewInvite), just pre-run here.
    if (!interviewGiven && matchScore >= 50) {
      await prisma.interviewSlot.create({
        data: {
          matchId: match.id,
          proposedTimes: ["2026-09-05 14:00", "2026-09-06 10:00"],
          status: "confirmed",
          confirmedTime: "2026-09-05 14:00",
        },
      });
      interviewGiven = true;
    }
    console.log(`  Match with "${position.title}": ${matchScore}%`);
  }

  console.log("Generating real AI Summary (Gemini) and resume PDF...");
  const summaryResult = await generateAIResume(jobSeeker.id);
  if ("error" in summaryResult) {
    console.error("  AI Summary failed:", summaryResult.error);
  } else {
    console.log("  AI Summary generated.");
  }

  const pdfResult = await generateResumePdfFromProfile(jobSeeker.id);
  if ("error" in pdfResult) {
    console.error("  Resume PDF failed:", pdfResult.error);
  } else {
    console.log("  Resume PDF generated and uploaded.");
  }

  const gapResult = await generateResumeGapAnalysis(jobSeeker.id);
  if ("error" in gapResult) {
    console.error("  Gap analysis failed:", gapResult.error);
  } else {
    console.log("  Gap analysis generated.");
  }

  console.log(`\nDone. Log in as this candidate at /login with:\n  Email: ${EMAIL}\n  Password: ${PASSWORD}\n  jobSeekerId: ${jobSeeker.id}`);
}

main()
  .catch((err) => {
    console.error("seedCompleteCandidate failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
