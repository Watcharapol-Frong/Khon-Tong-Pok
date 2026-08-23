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
      linkUrl: `/company/positions/${slot.match.positionId}/candidates-live`,
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
 * For the temporary /company/positions/[id]/candidates-live page — real
 * Match rows for one position, ranked by score. Returns null on a
 * companyId mismatch (wrong company or a stale/tampered positionId),
 * treated as not-found by the caller.
 */
export async function getMatchesForPosition(positionId: string, companyId: string) {
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position || position.companyId !== companyId) return null;

  const matches = await prisma.match.findMany({
    where: { positionId },
    include: { jobSeeker: { include: { profile: true } }, interviewSlot: true },
    orderBy: { matchScore: "desc" },
  });
  return { position, matches };
}
