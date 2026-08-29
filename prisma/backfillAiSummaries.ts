/**
 * One-time backfill: generates a Gemini AI Summary (see generateAIResume in
 * src/lib/actions/jobSeeker.ts) for every JobSeeker who doesn't have one yet
 * — otherwise HR's /company/candidates/[id] report shows "ยังไม่มี AI
 * Summary" for anyone who never pressed "ให้น้องตรงปกช่วยสร้าง" themselves.
 *
 * Calls the real Gemini API per candidate (GEMINI_API_KEY from .env) — has
 * a cost, run deliberately rather than on a schedule.
 *
 * Run with: npx tsx prisma/backfillAiSummaries.ts
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { generateAIResume } from "../src/lib/actions/jobSeeker";

// GEMINI_API_KEY only lives in .env.local (Next.js's runtime env file) —
// bare "dotenv/config" only loads .env, same gap the .env file's own
// comment calls out for DATABASE_URL/DIRECT_URL. Load both, .env.local
// last so it wins, matching next dev's own precedence.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.jobSeeker.findMany({
    where: { aiSummary: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${candidates.length} candidate(s) without an AI Summary.`);

  let generated = 0;
  let skippedNoProfile = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const result = await generateAIResume(candidate.id);
    if ("error" in result) {
      if (result.error.startsWith("กรุณากรอกข้อมูลโปรไฟล์")) {
        skippedNoProfile++;
        console.log(`  – ${candidate.name} (${candidate.id}): ไม่มีข้อมูลโปรไฟล์พอสร้าง summary, ข้าม`);
      } else {
        failed++;
        console.error(`  ✗ ${candidate.name} (${candidate.id}): ${result.error}`);
      }
      continue;
    }
    generated++;
    console.log(`  ✓ ${candidate.name} (${candidate.id})`);
  }

  console.log(
    `\nDone. Generated ${generated}, skipped ${skippedNoProfile} (no profile data), failed ${failed}.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
