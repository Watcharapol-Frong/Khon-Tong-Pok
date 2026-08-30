"use server";

import { prisma } from "@/lib/prisma";

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
  companyId: string,
  proposedTimes: string[]
): Promise<{ ok: true } | { error: string }> {
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
  jobSeekerId: string,
  response: "confirm" | "decline",
  confirmedTime?: string
): Promise<{ ok: true } | { error: string }> {
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

export async function getHRNotifications(hrUserId: string) {
  return prisma.notification.findMany({
    where: { hrUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getJobSeekerNotifications(jobSeekerId: string) {
  return prisma.notification.findMany({
    where: { jobSeekerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(notificationId: string): Promise<{ ok: true }> {
  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  return { ok: true };
}

export async function markAllNotificationsRead(
  recipient: { hrUserId: string } | { jobSeekerId: string }
): Promise<{ ok: true }> {
  await prisma.notification.updateMany({ where: recipient, data: { isRead: true } });
  return { ok: true };
}

/** For /applications — every Match this candidate has, with its Position/Company and interview status, most recent first. */
export async function getMyApplications(jobSeekerId: string) {
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
export async function getMatchesForPosition(positionId: string, companyId: string) {
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
export async function getDashboardSummary(companyId: string) {
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
export async function getMatchCountsByPosition(companyId: string): Promise<Record<string, number>> {
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
 * nameRevealed: true once *any* of this candidate's matches with this
 * company has an InterviewSlot at all — HR sending the invite (sendInterviewInvite
 * creates the slot as "pending" before the candidate has responded) is what
 * unblinds Blind Review here, not the candidate's later confirm/decline. A
 * candidate matched to multiple positions at the same company isn't still
 * "blind" to that HR team just because one specific match hasn't gotten an
 * invite yet.
 */
export async function getCandidateReport(jobSeekerId: string, companyId: string) {
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
    nameRevealed: jobSeeker.matches.some((m) => m.interviewSlot !== null),
    isStandout: jobSeeker.matches.some((m) => m.isStandout),
  };
}

/** Same nameRevealed rule as getCandidateReport above, standalone for authorization checks (e.g. the resume-file route handler) that don't need the rest of the report. Returns false (not an error) for a jobSeeker/company pair with no Match at all — same not-found-shaped-as-false posture as elsewhere in this file. */
export async function isNameRevealedForCompany(jobSeekerId: string, companyId: string): Promise<boolean> {
  const match = await prisma.match.findFirst({
    where: { jobSeekerId, position: { companyId }, interviewSlot: { isNot: null } },
    select: { id: true },
  });
  return match !== null;
}

/** For /company/interviews — every interview invite this company has ever sent, real DB data (this used to read from the old localStorage companyStore mock). */
export async function getInterviewSlotsForCompany(companyId: string) {
  const slots = await prisma.interviewSlot.findMany({
    where: { match: { position: { companyId } } },
    include: { match: { include: { jobSeeker: true, position: true } } },
    orderBy: { id: "desc" },
  });
  return slots.map((slot) => ({
    id: slot.id,
    positionId: slot.match.positionId,
    positionTitle: slot.match.position.title,
    jobSeekerId: slot.match.jobSeekerId,
    jobSeekerName: slot.match.jobSeeker.name,
    proposedTimes: slot.proposedTimes,
    confirmedTime: slot.confirmedTime,
    status: slot.status,
  }));
}

/**
 * HR directly setting/editing the confirmed interview time — distinct from
 * respondToInterviewInvite (the candidate's own confirm/decline). Same
 * not-found-not-forbidden scoping via position→companyId as the rest of
 * this file. Match.status moves to "contacted" too, same as the candidate
 * confirming would do, so nameRevealed/dashboard logic stay consistent
 * regardless of which side set the time.
 */
export async function setInterviewConfirmedTime(
  positionId: string,
  jobSeekerId: string,
  companyId: string,
  confirmedTime: string
): Promise<{ ok: true } | { error: string }> {
  const match = await prisma.match.findFirst({
    where: { positionId, jobSeekerId, position: { companyId } },
    include: { interviewSlot: true },
  });
  if (!match || !match.interviewSlot) {
    return { error: "ไม่พบนัดสัมภาษณ์นี้ หรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  await prisma.$transaction([
    prisma.interviewSlot.update({
      where: { id: match.interviewSlot.id },
      data: { status: "confirmed", confirmedTime },
    }),
    prisma.match.update({ where: { id: match.id }, data: { status: "contacted" } }),
  ]);
  return { ok: true };
}

/** HR withdrawing an interview invite entirely — deletes the InterviewSlot and reverts the Match to "pending", so the candidate list treats this position/candidate pair as not-yet-invited again. */
export async function cancelInterviewInvite(
  positionId: string,
  jobSeekerId: string,
  companyId: string
): Promise<{ ok: true } | { error: string }> {
  const match = await prisma.match.findFirst({
    where: { positionId, jobSeekerId, position: { companyId } },
    include: { interviewSlot: true },
  });
  if (!match || !match.interviewSlot) {
    return { error: "ไม่พบนัดสัมภาษณ์นี้ หรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  await prisma.$transaction([
    prisma.interviewSlot.delete({ where: { id: match.interviewSlot.id } }),
    prisma.match.update({ where: { id: match.id }, data: { status: "pending" } }),
  ]);
  return { ok: true };
}
