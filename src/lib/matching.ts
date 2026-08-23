import type { PositionSoftSkillRequirements, SoftSkillScores } from "@/lib/types";

/**
 * Pure scoring functions — no Prisma import, no "use server". Callers (both
 * prisma/seed.ts, a plain Node script, and any future Server Action) fetch
 * their own data and pass plain values in, so this file has no framework
 * boundary to cross either way.
 */

export type HardSkillVerification = { skill: string; status: string };

/** 0-100, or null if the position has no hard-skill requirements to score against. */
export function computeHardSkillScore(
  requiredHardSkills: string[],
  verifications: HardSkillVerification[]
): number | null {
  if (requiredHardSkills.length === 0) return null;

  const matched = requiredHardSkills.reduce((sum, skill) => {
    const found = verifications.find((v) => v.skill === skill);
    if (!found) return sum;
    if (found.status === "verified") return sum + 1;
    if (found.status === "partial") return sum + 0.5;
    return sum;
  }, 0);

  return (matched / requiredHardSkills.length) * 100;
}

/**
 * 0-100, or null if the position has no soft-skill requirements to score
 * against, or the candidate has no GameResult yet (games aren't wired up
 * for real players — see src/app/profile/page.tsx's empty state for the
 * same "no data yet" case).
 */
export function computeSoftSkillScore(
  requiredSoftSkills: PositionSoftSkillRequirements,
  gameResult: SoftSkillScores | null
): number | null {
  const requiredDims = (Object.entries(requiredSoftSkills) as [keyof SoftSkillScores, number | undefined][]).filter(
    (entry): entry is [keyof SoftSkillScores, number] => entry[1] !== undefined
  );
  if (requiredDims.length === 0) return null;
  if (!gameResult) return null;

  const total = requiredDims.reduce((sum, [dim, required]) => {
    const actual = gameResult[dim] ?? 0;
    return sum + Math.min(100, (actual / required) * 100);
  }, 0);
  return total / requiredDims.length;
}

/**
 * 60% hard skill / 40% soft skill — same weighting already in use by the
 * mock matcher (src/lib/companyStore.ts computeMatchScore), carried over
 * rather than re-decided here. Falls back to whichever side has data when
 * the other is null (no requirements on that side, or — for soft — no
 * GameResult yet), and to a neutral 50 if neither side has anything to
 * score against.
 */
export function computeMatchScore(hardScore: number | null, softScore: number | null): number {
  if (hardScore === null && softScore === null) return 50;
  if (hardScore === null) return Math.round(softScore!);
  if (softScore === null) return Math.round(hardScore);
  return Math.round(hardScore * 0.6 + softScore * 0.4);
}
