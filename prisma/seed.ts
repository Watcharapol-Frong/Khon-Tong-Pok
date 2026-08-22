/**
 * Seeds a batch of fake JobSeeker candidates (with profiles, game results,
 * chat verifications, and Match rows against real Positions) for testing
 * the HR side of the app with something closer to real volume/variety.
 *
 * Run with:      npx tsx prisma/seed.ts
 * Clean up with: npx tsx prisma/seed.ts --clean
 *
 * All test data is identifiable two ways, both used for cleanup below —
 * there's no dedicated "isTestData" schema field (would need its own
 * migration for what naming already fully covers):
 *   - JobSeeker.email ends with "@example-test.com"
 *   - JobSeeker.name and any Position this script creates are prefixed "[TEST] "
 *
 * Idempotent: every run cleans up any previously-seeded test data first,
 * then reseeds fresh — safe to re-run without accumulating duplicates.
 *
 * IMPORTANT: company/positions/[id]/candidates and company/candidates/[id]
 * still read entirely from the mock companyStore (localStorage), not the
 * database — that migration was explicitly deferred. This seed populates
 * real rows for testing via Prisma Studio / psql, not via those pages yet.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import onetSkillsData from "../src/data/onet_skills_dictionary_full.json" with { type: "json" };

const prisma = new PrismaClient();

const TEST_EMAIL_DOMAIN = "example-test.com";
const TEST_NAME_PREFIX = "[TEST] ";
const TEST_COMPANY_DOMAIN = "testco.com";
const CANDIDATE_COUNT = 40;
const STANDOUT_COUNT = 3;

const onetHardSkills: string[] = onetSkillsData.hardSkills;
function assertKnownSkills(skills: string[], label: string) {
  const unknown = skills.filter((s) => !onetHardSkills.includes(s));
  if (unknown.length > 0) {
    throw new Error(`${label} contains skills not in the O*NET dictionary: ${unknown.join(", ")}`);
  }
}

// Verified against the real dictionary (see the exploration this seed
// script was built from) — every entry here is an exact, case-sensitive
// match, the same constraint SkillAutocomplete enforces in the real UI.
const DEV_SKILLS = ["Python", "JavaScript", "React", "Docker", "Git", "MySQL", "Linux", "Kubernetes", "Node.js", "TypeScript"];
const DESIGN_SKILLS = ["Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Figma", "Adobe After Effects", "Adobe Premiere Pro", "Canva"];
const MARKETING_SKILLS = ["Google Analytics", "Facebook", "Google Ads", "Sales and Marketing", "Hootsuite", "LinkedIn"];
const OFFICE_SKILLS = ["Microsoft Excel", "Microsoft Word", "Microsoft PowerPoint", "Microsoft Outlook"];
const SKILL_CLUSTERS = [DEV_SKILLS, DESIGN_SKILLS, MARKETING_SKILLS];
assertKnownSkills([...DEV_SKILLS, ...DESIGN_SKILLS, ...MARKETING_SKILLS, ...OFFICE_SKILLS], "seed skill cluster");

const FIRST_NAMES = [
  "สมชาย", "สมหญิง", "วิชัย", "นภาพร", "ธนกร", "กัลยา", "อนุชา", "พิมพ์ใจ", "ชัยวัฒน์", "สุดารัตน์",
  "ประยุทธ", "วรรณา", "อภิชาติ", "ศิริพร", "ณัฐพล", "จันทิมา", "กิตติศักดิ์", "รัตนา", "ปิยะ", "อรุณี",
  "สุรชัย", "มาลี", "ธีรพงษ์", "อัมพร", "วีระ", "รุ่งนภา", "ชาญชัย", "บุษบา", "เอกชัย", "ลัดดา",
];
const LAST_NAMES = [
  "ใจดี", "รักเรียน", "ศรีสุข", "แสงทอง", "มั่งมี", "จันทร์เพ็ญ", "บุญมาก", "ทองดี", "สายบัว", "พูลสวัสดิ์",
  "วงศ์ษา", "เจริญสุข", "ผลบุญ", "แก้วมณี", "อยู่สุข", "ทิพย์วงศ์",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

async function cleanTestData() {
  const testJobSeekers = await prisma.jobSeeker.findMany({
    where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const jobSeekerIds = testJobSeekers.map((j) => j.id);

  const testPositions = await prisma.position.findMany({
    where: { title: { startsWith: TEST_NAME_PREFIX } },
    select: { id: true },
  });
  const positionIds = testPositions.map((p) => p.id);

  const matchWhere = { OR: [{ jobSeekerId: { in: jobSeekerIds } }, { positionId: { in: positionIds } }] };
  const matches = await prisma.match.findMany({ where: matchWhere, select: { id: true } });
  const matchIds = matches.map((m) => m.id);

  await prisma.interviewSlot.deleteMany({ where: { matchId: { in: matchIds } } });
  await prisma.match.deleteMany({ where: matchWhere });

  const profiles = await prisma.jobSeekerProfile.findMany({
    where: { jobSeekerId: { in: jobSeekerIds } },
    select: { id: true },
  });
  const profileIds = profiles.map((p) => p.id);
  await prisma.educationEntry.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.workExperienceEntry.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.languageSkillEntry.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.certificateEntry.deleteMany({ where: { profileId: { in: profileIds } } });
  await prisma.jobSeekerProfile.deleteMany({ where: { jobSeekerId: { in: jobSeekerIds } } });

  await prisma.chatVerification.deleteMany({ where: { jobSeekerId: { in: jobSeekerIds } } });
  await prisma.gameResult.deleteMany({ where: { jobSeekerId: { in: jobSeekerIds } } });
  await prisma.aISummary.deleteMany({ where: { jobSeekerId: { in: jobSeekerIds } } });

  await prisma.jobSeeker.deleteMany({ where: { id: { in: jobSeekerIds } } });
  await prisma.position.deleteMany({ where: { id: { in: positionIds } } });

  console.log(`Cleaned up ${jobSeekerIds.length} test job seeker(s) and ${positionIds.length} test position(s).`);
}

async function ensureTestCompanyAndPositions() {
  let company = await prisma.company.findUnique({ where: { domain: TEST_COMPANY_DOMAIN } });
  if (!company) {
    company = await prisma.company.create({ data: { name: "Test Company", domain: TEST_COMPANY_DOMAIN } });
    await prisma.hRUser.create({
      data: { name: "Test HR", email: `hr@${TEST_COMPANY_DOMAIN}`, password: "test1234", companyId: company.id },
    });
    console.log(`Created Test Company (${TEST_COMPANY_DOMAIN}) with HR login hr@${TEST_COMPANY_DOMAIN} / test1234`);
  }

  // Real, already-existing positions (e.g. a "Backend Developer" role
  // created earlier through the actual HR UI) are left untouched — only
  // these two extra [TEST]-prefixed positions are created, so candidates
  // with non-dev skill clusters (marketing/design) have something to
  // score well against too, not just the one dev-heavy real position.
  const seedPositionSpecs: {
    title: string;
    requiredHardSkills: string[];
    requiredSoftSkills: Record<string, number>;
  }[] = [
    {
      title: `${TEST_NAME_PREFIX}Marketing Specialist`,
      requiredHardSkills: MARKETING_SKILLS.slice(0, 5),
      requiredSoftSkills: { collaborationMindset: 60, criticalThinking: 55 },
    },
    {
      title: `${TEST_NAME_PREFIX}UI/UX Designer`,
      requiredHardSkills: DESIGN_SKILLS.slice(0, 5),
      requiredSoftSkills: { learningAgility: 60, resilienceAdaptability: 55 },
    },
  ];

  for (const spec of seedPositionSpecs) {
    const existing = await prisma.position.findFirst({ where: { companyId: company.id, title: spec.title } });
    if (!existing) {
      await prisma.position.create({
        data: {
          companyId: company.id,
          title: spec.title,
          requiredHardSkills: spec.requiredHardSkills,
          requiredSoftSkills: spec.requiredSoftSkills,
          status: "open",
        },
      });
    }
  }

  return prisma.position.findMany({ where: { companyId: company.id } });
}

async function seedCandidates(positions: { id: string; requiredHardSkills: string[] }[]) {
  const CHAT_STATUSES = ["verified", "partial", "unclear"] as const;

  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    const isStandout = i >= CANDIDATE_COUNT - STANDOUT_COUNT;
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
    const name = `${TEST_NAME_PREFIX}${firstName} ${lastName}`;
    const email = `testuser${String(i + 1).padStart(2, "0")}@${TEST_EMAIL_DOMAIN}`;

    const cluster = SKILL_CLUSTERS[i % SKILL_CLUSTERS.length];
    const pool = Math.random() < 0.5 ? [...cluster, ...OFFICE_SKILLS] : cluster;
    const hardSkills = pickRandom(pool, randomInt(5, 10));

    const jobSeeker = await prisma.jobSeeker.create({
      data: { name, email, password: "test1234" },
    });

    await prisma.jobSeekerProfile.create({
      data: {
        jobSeekerId: jobSeeker.id,
        computerSkills: hardSkills,
        resumeRawText: `${TEST_NAME_PREFIX}ตัวอย่างเรซูเม่สำหรับทดสอบระบบ — ${name}`,
        desiredPosition: cluster === DEV_SKILLS ? "Software Developer" : cluster === DESIGN_SKILLS ? "UI/UX Designer" : "Marketing Specialist",
      },
    });

    // Realistic spread: most candidates land anywhere in a wide band;
    // designated standouts get near-maxed scores on all 4 dimensions so
    // the "ช้างเผือก" badge (driven by Match.isStandout below, not
    // directly by these) has genuinely strong candidates behind it.
    const gameScores = isStandout
      ? {
          riskTolerance: randomInt(88, 100),
          cognitiveFlexibility: randomInt(88, 100),
          selectiveAttention: randomInt(88, 100),
          prosociality: randomInt(88, 100),
        }
      : {
          riskTolerance: randomInt(15, 95),
          cognitiveFlexibility: randomInt(15, 95),
          selectiveAttention: randomInt(15, 95),
          prosociality: randomInt(15, 95),
        };
    await prisma.gameResult.create({ data: { jobSeekerId: jobSeeker.id, ...gameScores } });

    for (const skill of hardSkills) {
      const status = CHAT_STATUSES[randomInt(0, CHAT_STATUSES.length - 1)];
      await prisma.chatVerification.create({
        data: {
          jobSeekerId: jobSeeker.id,
          skill,
          status,
          conversationLog: [
            { role: "system", text: `${TEST_NAME_PREFIX}auto-generated verification for seed testing` },
          ],
        },
      });
    }

    for (const position of positions) {
      const required = position.requiredHardSkills;
      const overlap = required.filter((s) => hardSkills.includes(s));
      let matchScore = required.length > 0 ? Math.round((overlap.length / required.length) * 100) : randomInt(30, 60);
      // A little noise so scores aren't suspiciously round, then clamp.
      matchScore = Math.min(100, Math.max(0, matchScore + randomInt(-5, 5)));
      if (isStandout) matchScore = Math.max(matchScore, randomInt(92, 100));

      await prisma.match.create({
        data: {
          positionId: position.id,
          jobSeekerId: jobSeeker.id,
          matchScore,
          isStandout: matchScore >= 90,
          status: "pending",
        },
      });
    }

    if ((i + 1) % 10 === 0) console.log(`  ...${i + 1}/${CANDIDATE_COUNT} candidates seeded`);
  }
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");

  console.log("Cleaning up any previously-seeded test data...");
  await cleanTestData();
  if (cleanOnly) {
    console.log("Done (--clean only, not reseeding).");
    return;
  }

  console.log("Ensuring Test Company + seed positions exist...");
  const positions = await ensureTestCompanyAndPositions();
  console.log(`Matching against ${positions.length} position(s): ${positions.map((p) => p.title).join(", ")}`);

  console.log(`Seeding ${CANDIDATE_COUNT} fake candidates (${STANDOUT_COUNT} standouts)...`);
  await seedCandidates(positions);

  console.log("Done. All test data uses @" + TEST_EMAIL_DOMAIN + " emails / \"" + TEST_NAME_PREFIX + "\" name prefix — run `npx tsx prisma/seed.ts --clean` to remove it.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
