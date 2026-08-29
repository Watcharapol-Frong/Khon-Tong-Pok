/**
 * One-time backfill: generates "ผลจากแบบทดสอบที่ 2" (see
 * generateResumeGapAnalysis in src/lib/actions/jobSeeker.ts) for every
 * JobSeeker who has both resume content and a GameResult but no
 * ResumeGapAnalysis row yet.
 *
 * Calls the real Gemini API per candidate (GEMINI_API_KEY from .env.local)
 * — has a cost, run deliberately rather than on a schedule.
 *
 * Run with: npx tsx prisma/backfillGapAnalysis.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { generateResumeGapAnalysis } from "../src/lib/actions/jobSeeker";

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.jobSeeker.findMany({
    where: { gapAnalysis: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${candidates.length} candidate(s) without a gap analysis.`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const result = await generateResumeGapAnalysis(candidate.id);
    if ("error" in result) {
      if (result.error.includes("กรุณาอัปโหลดเรซูเม่") || result.error.includes("ต้องเล่นมินิเกม")) {
        skipped++;
        console.log(`  – ${candidate.name} (${candidate.id}): ${result.error}, ข้าม`);
      } else {
        failed++;
        console.error(`  ✗ ${candidate.name} (${candidate.id}): ${result.error}`);
      }
      continue;
    }
    generated++;
    console.log(`  ✓ ${candidate.name} (${candidate.id})`);
  }

  console.log(`\nDone. Generated ${generated}, skipped ${skipped} (missing resume or game data), failed ${failed}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
