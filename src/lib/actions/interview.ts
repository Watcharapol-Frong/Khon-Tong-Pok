"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentJobSeeker, getHRContext } from "@/lib/auth";
const NOT_SIGNED_IN = "กรุณาเข้าสู่ระบบก่อนครับ";

/**
 * Which company this request is allowed to see, and which HR user made it.
 *
 * Every function below used to take `companyId` (and sometimes `hrUserId` or
 * `jobSeekerId`) as a parameter from the browser. The ownership checks were
 * already correct — `position.companyId !== companyId` and friends — but the
 * value they compared against was chosen by the caller, so the check only
 * confirmed the caller was consistent with themselves. Changing one string in
 * devtools returned another company's matched candidates, dashboard and
 * reports.
 *
 * The checks are unchanged. What changed is where the id comes from.
 */
async function sessionCompanyId(): Promise<string | null> {
  const ctx = await getHRContext();
  return ctx?.companyId ?? null;
}

async function sessionHrUserId(): Promise<string | null> {
  const ctx = await getHRContext();
  return ctx?.hrUserId ?? null;
}

async function sessionJobSeekerId(): Promise<string | null> {
  const jobSeeker = await getCurrentJobSeeker();
  return jobSeeker?.id ?? null;
}


/**
 * HR-initiated: proposes interview times for a real Match. Creates the
 * InterviewSlot (matchId is @unique — a Match can only ever have one) and
 * notifies the candidate. companyId comes from the caller's own session
 * (useCompanySession), never trusted from the client directly — a mismatch
 * is reported as "not found" rather than "forbidden" so it can't be used to
 * probe whether a given matchId exists at all, same pattern as
 * updatePosition/closePosition in position.ts.
 */
export async function sendInterviewInvite(
  matchId: string,
  proposedTimes: string[]
): Promise<{ ok: true } | { error: string }> {
  const companyId = await sessionCompanyId();
  if (!companyId) return { error: NOT_SIGNED_IN };
  if (proposedTimes.length === 0) {
    return { error: "กรุณาเลือกวัน-เวลาอย่างน้อย 1 ช่วง" };
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { position: true, jobSeeker: true, interviewSlot: true },
  });
  if (!match || match.position.companyId !== companyId) {
    return { error: "ไม่พบผู้สมัครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  if (match.interviewSlot) {
    return { error: "มีการนัดสัมภาษณ์กับผู้สมัครนี้อยู่แล้ว" };
  }

  await prisma.interviewSlot.create({
    data: { matchId, proposedTimes, status: "pending" },
  });

  await prisma.notification.create({
    data: {
      jobSeekerId: match.jobSeekerId,
      type: "interview_invite",
      message: `คุณได้รับคำเชิญสัมภาษณ์สำหรับตำแหน่ง "${match.position.title}" — กรุณาตอบรับหรือปฏิเสธ`,
      linkUrl: "/applications",
    },
  });

  return { ok: true };
}

/**
 * Candidate-initiated: accepts or declines an interview invite.
 * jobSeekerId comes from the caller's own session (useJobSeekerSession),
 * never trusted from the client — same not-found-not-forbidden reasoning
 * as sendInterviewInvite. Notifies every HRUser at the position's company,
 * since a Position has no single owner HR account here (see the doc
 * comment on the Notification model).
 */
export async function respondToInterviewInvite(
  interviewSlotId: string,
  response: "confirm" | "decline",
  confirmedTime?: string
): Promise<{ ok: true } | { error: string }> {
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return { error: NOT_SIGNED_IN };
  if (response === "confirm" && !confirmedTime) {
    return { error: "กรุณาเลือกวัน-เวลาที่สะดวก" };
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: interviewSlotId },
    include: {
      match: { include: { jobSeeker: true, position: { include: { company: { include: { hrUsers: true } } } } } },
    },
  });
  if (!slot || slot.match.jobSeekerId !== jobSeekerId) {
    return { error: "ไม่พบคำเชิญนี้ หรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  if (slot.status !== "pending") {
    return { error: "คำเชิญนี้ถูกตอบรับหรือปฏิเสธไปแล้ว" };
  }

  const newSlotStatus = response === "confirm" ? "confirmed" : "declined";
  const newMatchStatus = response === "confirm" ? "contacted" : "declined";

  await prisma.$transaction([
    prisma.interviewSlot.update({
      where: { id: interviewSlotId },
      data: { status: newSlotStatus, ...(response === "confirm" ? { confirmedTime } : {}) },
    }),
    prisma.match.update({ where: { id: slot.matchId }, data: { status: newMatchStatus } }),
  ]);

  const responseLabel = response === "confirm" ? "ตอบรับ" : "ปฏิเสธ";
  const message = `${slot.match.jobSeeker.name} ${responseLabel}คำเชิญสัมภาษณ์สำหรับตำแหน่ง "${slot.match.position.title}"`;
  await prisma.notification.createMany({
    data: slot.match.position.company.hrUsers.map((hr) => ({
      hrUserId: hr.id,
      type: "interview_response",
      message,
      linkUrl: `/company/positions/${slot.match.positionId}/candidates`,
    })),
  });

  return { ok: true };
}

export async function getHRNotifications() {
  const hrUserId = await sessionHrUserId();
  if (!hrUserId) return [];
  return prisma.notification.findMany({
    where: { hrUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getJobSeekerNotifications() {
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return [];
  return prisma.notification.findMany({
    where: { jobSeekerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Marks one notification read — only if it belongs to the caller.
 *
 * `updateMany` rather than `update` on purpose: it applies the ownership
 * condition inside the WHERE clause, so a notification belonging to someone
 * else simply matches nothing. `update` would need a separate read first, and
 * a read-then-write is both slower and a race.
 *
 * Marking a stranger's notification read is minor next to reading it, but it is
 * still writing to another user's data on their behalf, and the fix costs one line.
 */
export async function markNotificationRead(notificationId: string): Promise<{ ok: true }> {
  const [jobSeekerId, hrUserId] = await Promise.all([
    sessionJobSeekerId(),
    sessionHrUserId(),
  ]);
  if (!jobSeekerId && !hrUserId) return { ok: true };

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      ...(jobSeekerId ? { jobSeekerId } : { hrUserId: hrUserId as string }),
    },
    data: { isRead: true },
  });
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  // Whose notifications get marked read is decided by who is signed in, not by
  // a recipient the caller names.
  const [jobSeekerId, hrUserId] = await Promise.all([
    sessionJobSeekerId(),
    sessionHrUserId(),
  ]);
  const recipient = jobSeekerId ? { jobSeekerId } : hrUserId ? { hrUserId } : null;
  if (!recipient) return { ok: true };

  await prisma.notification.updateMany({ where: recipient, data: { isRead: true } });
  return { ok: true };
}

/** For /applications — every Match this candidate has, with its Position/Company and interview status, most recent first. */
export async function getMyApplications() {
  const jobSeekerId = await sessionJobSeekerId();
  if (!jobSeekerId) return [];
  return prisma.match.findMany({
    where: { jobSeekerId },
    include: { position: { include: { company: true } }, interviewSlot: true },
    orderBy: { id: "desc" }, // cuids are creation-ordered, no separate createdAt column on Match
  });
}

/**
 * For /company/positions/[id]/candidates — real Match rows for one
 * position, ranked by score, with everything the list view needs to render
 * Blind Review (jobSeeker for the name/email gate), verified hard-skill
 * chips (chatVerifications), and the top-soft-skill highlight (gameResult,
 * nullable — candidate hasn't played the games yet). Returns null on a
 * companyId mismatch (wrong company or a stale/tampered positionId),
 * treated as not-found by the caller.
 */
export async function getMatchesForPosition(positionId: string) {
  const companyId = await sessionCompanyId();
  if (!companyId) return null;
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position || position.companyId !== companyId) return null;

  const matches = await prisma.match.findMany({
    where: { positionId },
    include: {
      jobSeeker: { include: { profile: true, chatVerifications: true, gameResult: true } },
      interviewSlot: true,
    },
    orderBy: { matchScore: "desc" },
  });
  return { position, matches };
}

/**
 * For the dashboard's KPI row + "ผู้สมัครช้างเผือก" widget. isStandout is
 * the same persisted field (matchScore >= 90, set at write-time — see
 * src/lib/matching.ts) the candidates list already reads, so this can't
 * drift from what that page shows. jobSeekerId is included only so the
 * caller can render the same "Candidate #XXXXXX" Blind Review label the
 * candidates list uses — no name/email is fetched here.
 */
export async function getDashboardSummary() {
  const companyId = await sessionCompanyId();
  if (!companyId) return { totalMatchesCount: 0, standoutCandidates: [] };
  const matches = await prisma.match.findMany({
    where: { position: { companyId } },
    select: { matchScore: true },
  });

  const standoutCandidates = await prisma.match.findMany({
    where: { position: { companyId }, isStandout: true },
    select: {
      id: true,
      jobSeekerId: true,
      positionId: true,
      matchScore: true,
      position: { select: { title: true } },
    },
    orderBy: { matchScore: "desc" },
  });

  return {
    totalMatchesCount: matches.length,
    standoutCandidates: standoutCandidates.map((m) => ({
      matchId: m.id,
      jobSeekerId: m.jobSeekerId,
      positionId: m.positionId,
      positionTitle: m.position.title,
      matchScore: m.matchScore,
    })),
  };
}

/** positionId -> Match count, for the dashboard's "N ผู้สมัคร Match" line per recent position. */
export async function getMatchCountsByPosition(): Promise<Record<string, number>> {
  const companyId = await sessionCompanyId();
  if (!companyId) return {};
  const grouped = await prisma.match.groupBy({
    by: ["positionId"],
    where: { position: { companyId } },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((g) => [g.positionId, g._count._all]));
}

/**
 * For /company/candidates/[id] — everything the Blind Review report needs
 * for one candidate, scoped to this HR's own company. Returns null if this
 * jobSeeker has no Match with any of this company's positions (wrong
 * company, or a stale/tampered id) — not-found rather than forbidden, same
 * reasoning as elsewhere in this file.
 *
 * nameRevealed mirrors the mock's exact rule: true once *any* of this
 * candidate's matches with this company reaches "contacted" — a candidate
 * matched to multiple positions at the same company isn't still "blind" to
 * that HR team just because one specific match hasn't converted yet.
 */
export async function getCandidateReport(jobSeekerId: string) {
  // jobSeekerId stays a parameter — HR legitimately picks which candidate to
  // open. What they may see is still bounded by their own company below.
  const companyId = await sessionCompanyId();
  if (!companyId) return null;
  const jobSeeker = await prisma.jobSeeker.findUnique({
    where: { id: jobSeekerId },
    include: {
      profile: { include: { workExperience: true, education: true } },
      chatVerifications: true,
      gameResult: true,
      aiSummary: true,
      matches: {
        where: { position: { companyId } },
        include: { position: true, interviewSlot: true },
      },
    },
  });
  if (!jobSeeker || jobSeeker.matches.length === 0) return null;

  return {
    jobSeeker,
    nameRevealed: jobSeeker.matches.some((m) => m.status === "contacted"),
    isStandout: jobSeeker.matches.some((m) => m.isStandout),
  };
}
