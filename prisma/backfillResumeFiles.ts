/**
 * One-time backfill: generates a PDF resume (see generateResumePdfFromProfile
 * in src/lib/actions/resumeFile.ts) for every JobSeekerProfile that has some
 * profile data but no resumeFileUrl yet — candidates who used the manual
 * form, or uploaded a PDF before file storage was wired up, so HR's
 * unblinded /company/candidates/[id] PDF preview has something to show.
 *
 * Uploads to Vercel Blob (BLOB_READ_WRITE_TOKEN from .env.local) — has a
 * (small) storage cost, run deliberately rather than on a schedule.
 *
 * Run with: npx tsx prisma/backfillResumeFiles.ts
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { generateResumePdfFromProfile } from "../src/lib/actions/resumeFile";

// BLOB_READ_WRITE_TOKEN and GEMINI_API_KEY only live in .env.local (Next's
// runtime env file) — bare "dotenv/config" only loads .env, same gap noted
// in backfillAiSummaries.ts. Load both, .env.local last so it wins.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.jobSeekerProfile.findMany({
    where: { resumeFileUrl: null },
    select: { jobSeekerId: true, jobSeeker: { select: { name: true } } },
  });

  console.log(`Found ${profiles.length} profile(s) without a resume file.`);

  let generated = 0;
  let skippedNoData = 0;
  let failed = 0;

  for (const profile of profiles) {
    const result = await generateResumePdfFromProfile(profile.jobSeekerId);
    if ("error" in result) {
      if (result.error.startsWith("ยังไม่มีข้อมูลโปรไฟล์")) {
        skippedNoData++;
        console.log(`  – ${profile.jobSeeker.name} (${profile.jobSeekerId}): ไม่มีข้อมูลพอสร้างเรซูเม่, ข้าม`);
      } else {
        failed++;
        console.error(`  ✗ ${profile.jobSeeker.name} (${profile.jobSeekerId}): ${result.error}`);
      }
      continue;
    }
    generated++;
    console.log(`  ✓ ${profile.jobSeeker.name} (${profile.jobSeekerId})`);
  }

  console.log(
    `\nDone. Generated ${generated}, skipped ${skippedNoData} (no profile data), failed ${failed}.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
