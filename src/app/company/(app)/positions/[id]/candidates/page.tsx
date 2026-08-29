"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Clock, Star, X } from "lucide-react";
import { InterviewInviteModal } from "@/components/InterviewInviteModal";
import { getMatchesForPosition, sendInterviewInvite } from "@/lib/actions/interview";
import { useCompanySession } from "@/lib/companySession";
import { SOFT_SKILL_AXIS_META, SOFT_SKILL_AXIS_ORDER } from "@/lib/data";
import type { PositionSoftSkillRequirements, SoftSkillScores } from "@/lib/types";

type MatchesData = Awaited<ReturnType<typeof getMatchesForPosition>>;
type MatchItem = NonNullable<MatchesData>["matches"][number];
type SortOrder = "score-desc" | "score-asc";

const PAGE_SIZE = 20;
const EMPTY_MATCHES: MatchItem[] = [];

// Same status → color/icon mapping as /company/interviews.
const INTERVIEW_STATUS_META = {
  pending: { label: "รอผู้สมัครยืนยัน", icon: Clock, className: "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]" },
  confirmed: { label: "ยืนยันนัดแล้ว", icon: Check, className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  declined: { label: "ปฏิเสธคำเชิญ", icon: X, className: "bg-[#F0F0F0] text-[#8A8A8A]" },
} as const;

/** Short, stable, non-obviously-sequential label for a Blind Review card — same idea as the mock's "Candidate #XXXX", just off a real cuid instead of a mock "js_..." id. */
function blindLabel(jobSeekerId: string): string {
  return `Candidate #${jobSeekerId.slice(-6).toUpperCase()}`;
}

/** Highest-scoring axis on a candidate's GameResult, or null if they haven't played the games yet — never fabricated. */
function topSoftSkill(
  gameResult: MatchItem["jobSeeker"]["gameResult"]
): { axis: keyof SoftSkillScores; value: number } | null {
  if (!gameResult) return null;
  let best: { axis: keyof SoftSkillScores; value: number } | null = null;
  for (const axis of SOFT_SKILL_AXIS_ORDER) {
    const value = gameResult[axis];
    if (!best || value > best.value) best = { axis, value };
  }
  return best;
}

export default function PositionCandidatesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const positionId = params.id;
  const session = useCompanySession();

  const [data, setData] = useState<MatchesData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteTargetId, setInviteTargetId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [sortOrder, setSortOrder] = useState<SortOrder>("score-desc");
  const [skillFilter, setSkillFilter] = useState("");
  // HR sets this themselves — nobody is excluded by default (0 = show
  // everyone). A system-picked cutoff would silently deny candidates a
  // chance without HR ever deciding to; this only filters when HR drags it.
  const [minScore, setMinScore] = useState(0);
  // How many of the filtered/sorted results are currently shown — resets to
  // one page whenever a filter changes below, so page 3 of an old filter
  // doesn't linger as the new, much shorter list's "page 3".
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const refresh = async () => {
    const fresh = await getMatchesForPosition(positionId, session.company.id);
    setData(fresh);
  };

  useEffect(() => {
    let cancelled = false;
    getMatchesForPosition(positionId, session.company.id).then((fresh) => {
      if (cancelled) return;
      setData(fresh);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- positionId/session.company.id stable for this page's lifetime
  }, []);

  // Stable reference (not a fresh `data?.matches ?? []` literal every
  // render) so this can sit in the useMemo dependency array below without
  // recomputing on every render whenever data is still null.
  const matches = data?.matches ?? EMPTY_MATCHES;

  const filteredCandidates = useMemo(() => {
    let list = matches;
    if (skillFilter.trim()) {
      const needle = skillFilter.trim().toLowerCase();
      list = list.filter((m) => m.jobSeeker.profile?.computerSkills.some((s) => s.toLowerCase().includes(needle)));
    }
    if (minScore > 0) {
      list = list.filter((m) => m.matchScore >= minScore);
    }
    list = [...list].sort((a, b) =>
      sortOrder === "score-desc" ? b.matchScore - a.matchScore : a.matchScore - b.matchScore
    );
    return list;
  }, [matches, sortOrder, skillFilter, minScore]);

  const visibleCandidates = filteredCandidates.slice(0, visibleCount);

  const handleSendInvite = async (proposedTimes: string[]) => {
    if (!inviteTargetId) return;
    setErrorMsg("");
    const result = await sendInterviewInvite(inviteTargetId, session.company.id, proposedTimes);
    setInviteTargetId(null);
    if ("error" in result) {
      setErrorMsg(result.error);
      return;
    }
    await refresh();
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="py-16 text-center text-sm text-[#8A8A8A]">กำลังโหลด...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8A8A8A]">
          <p>ไม่พบตำแหน่งงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link href="/company/positions" className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับไปหน้าจัดการตำแหน่งงาน
          </Link>
        </div>
      </div>
    );
  }

  const { position } = data;
  const requiredSoftSkills = position.requiredSoftSkills as PositionSoftSkillRequirements;
  const softSkillEntries = (
    Object.entries(requiredSoftSkills) as [keyof SoftSkillScores, number | undefined][]
  ).filter((entry): entry is [keyof SoftSkillScores, number] => entry[1] !== undefined);

  const inviteTarget = matches.find((m) => m.id === inviteTargetId);

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

        <div className="mt-2 mb-6 rounded-2xl bg-[#FAFAFA] p-4">
          <h1 className="text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">{position.title}</h1>
          {position.requiredHardSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {position.requiredHardSkills.map((skill) => (
                <span key={skill} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A]">
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

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => {
              setSkillFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
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

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#FAFAFA] px-3.5 py-2.5">
          <label htmlFor="min-score" className="flex-shrink-0 text-xs font-bold text-[#0F0F0F]">
            Match ขั้นต่ำ
          </label>
          <input
            id="min-score"
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setVisibleCount(PAGE_SIZE);
            }}
            className="min-w-[120px] flex-1 accent-[#0F0F0F]"
          />
          <span className="flex-shrink-0 text-xs font-bold text-[#0F0F0F]">
            {minScore === 0 ? "แสดงทั้งหมด" : `≥ ${minScore}%`}
          </span>
        </div>

        <p className="mb-3 text-xs text-[#8A8A8A]">
          ผู้สมัคร Match {filteredCandidates.length} คน
          {visibleCandidates.length < filteredCandidates.length && ` (กำลังแสดง ${visibleCandidates.length} คน)`}
        </p>

        {visibleCandidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            ไม่พบผู้สมัครที่ตรงเงื่อนไข
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visibleCandidates.map((m) => {
              const verifiedSkills = m.jobSeeker.chatVerifications.filter((v) => v.status === "verified");
              const top = topSoftSkill(m.jobSeeker.gameResult);
              const slot = m.interviewSlot;
              const InterviewStatusIcon = slot ? INTERVIEW_STATUS_META[slot.status as keyof typeof INTERVIEW_STATUS_META].icon : null;

              return (
                // A plain div (not <Link>) because the "นัดสัมภาษณ์" button
                // below needs to be independently clickable — nesting a
                // <button> inside an <a> is invalid HTML and would also
                // trigger the link's navigation on every button click.
                <div
                  key={m.id}
                  onClick={() => router.push(`/company/candidates/${m.jobSeekerId}`)}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F0F0F0] cursor-pointer"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0F0F0]">
                    <Image
                      src="/mascot/mascot-blind-candidate.png"
                      alt="ผู้สมัครที่ยังไม่เปิดเผยตัวตน (Blind Review)"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-[#0F0F0F]">{blindLabel(m.jobSeekerId)}</span>
                      {m.isStandout && (
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-[rgba(245,217,73,0.25)] px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#856700]">
                          <Star className="h-2.5 w-2.5 fill-current" strokeWidth={1.75} />
                          ช้างเผือก
                        </span>
                      )}
                      {/* Only shown when there's no interview slot yet — once
                          one exists, the labeled status pill on the right
                          already covers this, so showing both here would be
                          two overlapping badges for the same candidate. */}
                      {!slot && (
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                            m.status === "contacted"
                              ? "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]"
                              : "bg-[#F0F0F0] text-[#5A5A5A]"
                          }`}
                        >
                          {m.status === "contacted" ? "ติดต่อแล้ว" : "รอติดต่อ"}
                        </span>
                      )}
                    </div>
                    {verifiedSkills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {verifiedSkills.map((v) => (
                          <span
                            key={v.skill}
                            className="inline-flex items-center gap-0.5 rounded bg-[#F0F0F0] px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A]"
                          >
                            <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                            {v.skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {top && (
                      <div className="mt-1 text-[10px] text-[#4D7CFF]">
                        โดดเด่นด้าน {SOFT_SKILL_AXIS_META[top.axis].en} ({top.value}%)
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-[#0F0F0F]">{m.matchScore}%</div>
                      <div className="text-[9px] text-[#8A8A8A]">Match</div>
                    </div>
                    {slot && InterviewStatusIcon ? (
                      slot.status === "confirmed" && slot.confirmedTime ? (
                        // "ยืนยันเวลา: ..." alone already says this is
                        // confirmed — a colored badge repeating "ยืนยันนัดแล้ว"
                        // next to it would just say the same thing twice.
                        <span className="text-[10px] font-bold text-[#0f5c22]">ยืนยันเวลา: {slot.confirmedTime}</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold ${INTERVIEW_STATUS_META[slot.status as keyof typeof INTERVIEW_STATUS_META].className}`}
                        >
                          <InterviewStatusIcon className="h-3 w-3" strokeWidth={2.5} />
                          {INTERVIEW_STATUS_META[slot.status as keyof typeof INTERVIEW_STATUS_META].label}
                        </span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInviteTargetId(m.id);
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

        {visibleCandidates.length < filteredCandidates.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="mt-4 w-full rounded-full bg-[#FAFAFA] py-2.5 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
          >
            โหลดเพิ่ม ({filteredCandidates.length - visibleCandidates.length} คนที่เหลือ)
          </button>
        )}
      </div>

      {inviteTarget && (
        <InterviewInviteModal
          candidateLabel={blindLabel(inviteTarget.jobSeekerId)}
          onClose={() => setInviteTargetId(null)}
          onSubmit={handleSendInvite}
        />
      )}
    </>
  );
}
