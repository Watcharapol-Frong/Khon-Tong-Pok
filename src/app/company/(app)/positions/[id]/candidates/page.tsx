"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Star } from "lucide-react";
import { InterviewInviteModal } from "@/components/InterviewInviteModal";
import {
  createInterviewInvite,
  ensureMatchesForPosition,
  getCandidatesSnapshot,
  getInterviewSlotSnapshot,
  getPositionSnapshot,
  getSessionSnapshot,
  subscribeToStore,
} from "@/lib/companyStore";
import { SOFT_SKILL_AXIS_META } from "@/lib/data";
import type { SoftSkillScores } from "@/lib/types";

const getServerSessionSnapshot = () => null;
const getServerNull = () => null;
// getServerSnapshot must return a referentially stable value across calls —
// a fresh `[]` literal on every call trips React's "should be cached to
// avoid an infinite loop" warning, unlike primitives like `null` above.
const EMPTY_CANDIDATES: never[] = [];
const getServerEmptyCandidates = () => EMPTY_CANDIDATES;

type SortOrder = "score-desc" | "score-asc";

export default function PositionCandidatesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const positionId = params.id;

  const session = useSyncExternalStore(
    subscribeToStore,
    getSessionSnapshot,
    getServerSessionSnapshot
  );
  const position = useSyncExternalStore(
    subscribeToStore,
    () => getPositionSnapshot(positionId),
    getServerNull
  );

  useEffect(() => {
    if (getSessionSnapshot() === null) {
      router.replace("/company/login");
    }
  }, [router]);

  // Backfills any missing Match records for this position — a mutation, so
  // it runs from an effect rather than inline in a getSnapshot-wrapped read.
  useEffect(() => {
    ensureMatchesForPosition(positionId);
  }, [positionId]);

  const candidates = useSyncExternalStore(
    subscribeToStore,
    () => getCandidatesSnapshot(positionId),
    getServerEmptyCandidates
  );

  const [sortOrder, setSortOrder] = useState<SortOrder>("score-desc");
  const [skillFilter, setSkillFilter] = useState("");
  const [inviteTargetId, setInviteTargetId] = useState<string | null>(null);

  const handleSendInvite = (proposedTimes: string[]) => {
    if (!inviteTargetId) return;
    createInterviewInvite(positionId, inviteTargetId, proposedTimes);
    setInviteTargetId(null);
  };

  const visibleCandidates = useMemo(() => {
    let list = candidates;
    if (skillFilter.trim()) {
      const needle = skillFilter.trim().toLowerCase();
      list = list.filter((c) =>
        c.jobSeeker.hardSkills.some((h) => h.skill.toLowerCase().includes(needle))
      );
    }
    list = [...list].sort((a, b) =>
      sortOrder === "score-desc" ? b.matchScore - a.matchScore : a.matchScore - b.matchScore
    );
    return list;
  }, [candidates, sortOrder, skillFilter]);

  if (!session) return null;

  // Guard: only this position's own company may view its candidates.
  if (!position || position.companyId !== session.company.id) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8A8A8A]">
          <p>ไม่พบตำแหน่งงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link
            href="/company/positions"
            className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับไปหน้าจัดการตำแหน่งงาน
          </Link>
        </div>
      </div>
    );
  }

  const softSkillEntries = (
    Object.entries(position.requiredSoftSkills) as [keyof SoftSkillScores, number | undefined][]
  ).filter((entry): entry is [keyof SoftSkillScores, number] => entry[1] !== undefined);

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <Link
          href="/company/positions"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          กลับไปหน้าจัดการตำแหน่งงาน
        </Link>

        <div className="mt-2 mb-6 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
          <h1 className="text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
            {position.title}
          </h1>
          {position.requiredHardSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {position.requiredHardSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {softSkillEntries.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {softSkillEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="rounded bg-[rgba(77,124,255,0.1)] px-1.5 py-0.5 text-[10px] font-semibold text-[#4D7CFF]"
                >
                  {SOFT_SKILL_AXIS_META[key].en} ≥{value}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="กรองตามชื่อ hard skill..."
            className="flex-1 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3 py-2 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
          >
            <option value="score-desc">Match % สูง → ต่ำ</option>
            <option value="score-asc">Match % ต่ำ → สูง</option>
          </select>
        </div>

        <p className="mb-3 text-xs text-[#8A8A8A]">
          ผู้สมัคร Match {visibleCandidates.length} คน
        </p>

        {visibleCandidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            ไม่พบผู้สมัครที่ตรงเงื่อนไข
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visibleCandidates.map((c) => {
              const verifiedSkills = c.jobSeeker.hardSkills.filter((h) => h.status === "verified");
              const topSoftSkill = (
                Object.entries(c.jobSeeker.softSkills) as [keyof SoftSkillScores, number | undefined][]
              )
                .filter((entry): entry is [keyof SoftSkillScores, number] => entry[1] !== undefined)
                .sort((a, b) => b[1] - a[1])[0];
              const interviewSlot = getInterviewSlotSnapshot(positionId, c.jobSeekerId);

              return (
                // A plain div (not <Link>) because the "นัดสัมภาษณ์" button
                // below needs to be independently clickable — nesting a
                // <button> inside an <a> is invalid HTML and would also
                // trigger the link's navigation on every button click.
                <div
                  key={c.jobSeekerId}
                  onClick={() => router.push(`/company/candidates/${c.jobSeekerId}`)}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-4 transition-colors hover:border-[rgba(15,15,15,0.25)] cursor-pointer"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F0F0F0] text-[11px] font-extrabold text-[#5A5A5A]">
                    #{c.jobSeekerId.replace(/^js_/, "").toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#0F0F0F]">
                        Candidate #{c.jobSeekerId.replace(/^js_/, "").toUpperCase()}
                      </span>
                      {c.isStandout && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[rgba(245,217,73,0.25)] px-2 py-0.5 text-[10px] font-bold text-[#856700]">
                          <Star className="h-2.5 w-2.5 fill-current" strokeWidth={1.75} />
                          ช้างเผือก
                        </span>
                      )}
                      {/* Status display only — the actual action is the
                          labeled "นัดสัมภาษณ์" button below, not this pill. */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.status === "contacted"
                            ? "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]"
                            : "bg-[#F0F0F0] text-[#5A5A5A]"
                        }`}
                      >
                        {interviewSlot?.status === "pending"
                          ? "รอผู้สมัครยืนยัน"
                          : interviewSlot?.status === "confirmed"
                            ? "ยืนยันนัดแล้ว"
                            : interviewSlot?.status === "declined"
                              ? "ปฏิเสธคำเชิญ"
                              : c.status === "contacted"
                                ? "ติดต่อแล้ว"
                                : "รอติดต่อ"}
                      </span>
                    </div>
                    {verifiedSkills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {verifiedSkills.map((h) => (
                          <span
                            key={h.skill}
                            className="inline-flex items-center gap-0.5 rounded bg-[#F0F0F0] px-1.5 py-0.5 text-[10px] text-[#5A5A5A]"
                          >
                            <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                            {h.skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {topSoftSkill && (
                      <div className="mt-1 text-[10px] text-[#4D7CFF]">
                        โดดเด่นด้าน {SOFT_SKILL_AXIS_META[topSoftSkill[0]].en} ({topSoftSkill[1]}%)
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-[#0F0F0F]">{c.matchScore}%</div>
                      <div className="text-[9px] text-[#8A8A8A]">Match</div>
                    </div>
                    {interviewSlot ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(59,245,92,0.15)] px-3 py-1.5 text-[10px] font-bold text-[#0f5c22]">
                        {interviewSlot.status === "pending" ? (
                          <>
                            <Clock className="h-3 w-3" strokeWidth={2} />
                            รอผู้สมัครยืนยัน
                          </>
                        ) : interviewSlot.status === "confirmed" ? (
                          <>
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                            {interviewSlot.confirmedTime ?? "ยืนยันนัดแล้ว"}
                          </>
                        ) : (
                          "ปฏิเสธคำเชิญ"
                        )}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInviteTargetId(c.jobSeekerId);
                        }}
                        className="rounded-full bg-[#0F0F0F] px-3 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                      >
                        นัดสัมภาษณ์
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inviteTargetId && (
        <InterviewInviteModal
          candidateLabel={`Candidate #${inviteTargetId.replace(/^js_/, "").toUpperCase()}`}
          onClose={() => setInviteTargetId(null)}
          onSubmit={handleSendInvite}
        />
      )}
    </>
  );
}
