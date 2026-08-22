"use server";

import { Prisma } from "@prisma/client";
import type { Position as PrismaPosition } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PositionSoftSkillRequirements } from "@/lib/types";

/** Position with requiredSoftSkills narrowed from Prisma's untyped Json column back to the shape we always write into it — we control every write below, so this cast is safe (no runtime validation needed for a prototype). */
export type PositionWithSkills = Omit<PrismaPosition, "requiredSoftSkills"> & {
  requiredSoftSkills: PositionSoftSkillRequirements;
};

function toPositionWithSkills(position: PrismaPosition): PositionWithSkills {
  return position as PositionWithSkills;
}

/** Drops undefined-valued axes before handing off to Prisma — PositionSoftSkillRequirements' fields are all optional, and an `undefined` value inside a JSON input object isn't valid Prisma.InputJsonValue (only actually-set axes should be stored, same as the previous mock behavior). */
function cleanSoftSkills(input: PositionSoftSkillRequirements): Prisma.InputJsonValue {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  ) as Prisma.InputJsonValue;
}

export async function getPositionsByCompany(companyId: string): Promise<PositionWithSkills[]> {
  const positions = await prisma.position.findMany({
    where: { companyId },
    orderBy: { id: "asc" }, // cuids are creation-ordered, no separate createdAt column yet
  });
  return positions.map(toPositionWithSkills);
}

export async function getPosition(positionId: string): Promise<PositionWithSkills | null> {
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  return position ? toPositionWithSkills(position) : null;
}

export async function createPosition(input: {
  companyId: string;
  title: string;
  requiredHardSkills: string[];
  requiredSoftSkills: PositionSoftSkillRequirements;
}): Promise<PositionWithSkills> {
  const position = await prisma.position.create({
    data: {
      companyId: input.companyId,
      title: input.title,
      requiredHardSkills: input.requiredHardSkills,
      requiredSoftSkills: cleanSoftSkills(input.requiredSoftSkills),
    },
  });
  return toPositionWithSkills(position);
}

/** companyId must match the position's actual owner — a mismatch (wrong company, or a tampered/stale id) is reported as "not found" rather than "forbidden", so it can't be used to probe whether a given positionId exists at all. */
export async function updatePosition(
  positionId: string,
  companyId: string,
  data: {
    title?: string;
    requiredHardSkills?: string[];
    requiredSoftSkills?: PositionSoftSkillRequirements;
  }
): Promise<PositionWithSkills | { error: string }> {
  const existing = await prisma.position.findUnique({ where: { id: positionId } });
  if (!existing || existing.companyId !== companyId) {
    return { error: "ไม่พบตำแหน่งงานนี้ หรือคุณไม่มีสิทธิ์แก้ไข" };
  }

  const updated = await prisma.position.update({
    where: { id: positionId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.requiredHardSkills !== undefined ? { requiredHardSkills: data.requiredHardSkills } : {}),
      ...(data.requiredSoftSkills !== undefined
        ? { requiredSoftSkills: cleanSoftSkills(data.requiredSoftSkills) }
        : {}),
    },
  });
  return toPositionWithSkills(updated);
}

export async function closePosition(
  positionId: string,
  companyId: string
): Promise<PositionWithSkills | { error: string }> {
  return setPositionStatus(positionId, companyId, "closed");
}

/** Not part of the original spec, but the existing HR UI already lets a closed position be reopened (a single toggle button) — dropping that on migration would be a silent feature regression, not just a data-source swap. */
export async function reopenPosition(
  positionId: string,
  companyId: string
): Promise<PositionWithSkills | { error: string }> {
  return setPositionStatus(positionId, companyId, "open");
}

async function setPositionStatus(
  positionId: string,
  companyId: string,
  status: "open" | "closed"
): Promise<PositionWithSkills | { error: string }> {
  const existing = await prisma.position.findUnique({ where: { id: positionId } });
  if (!existing || existing.companyId !== companyId) {
    return { error: "ไม่พบตำแหน่งงานนี้ หรือคุณไม่มีสิทธิ์แก้ไข" };
  }
  const updated = await prisma.position.update({ where: { id: positionId }, data: { status } });
  return toPositionWithSkills(updated);
}
