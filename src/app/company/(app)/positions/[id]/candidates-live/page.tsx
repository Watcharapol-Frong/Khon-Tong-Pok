"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Clock, Star } from "lucide-react";
import { InterviewInviteModal } from "@/components/InterviewInviteModal";
import { getMatchesForPosition, sendInterviewInvite } from "@/lib/actions/interview";
import { useCompanySession } from "@/lib/companySession";

/**
 * Temporary real-data view — /company/positions/[id]/candidates (the
 * original route) still reads entirely from the mock companyStore. This
 * page exists solely so HR has somewhere to send a real interview invite
 * against a real Match row while that full migration is still pending
 * (needs auto-matching + GameResult + Blind Review, deferred separately).
 * Once that lands, this route's suffix goes away and it replaces the mock
 * page outright rather than living alongside it.
 */
export default function CandidatesLivePage() {
  const params = useParams<{ id: string }>();
  const positionId = params.id;
  const session = useCompanySession();

  const [data, setData] = useState<Awaited<ReturnType<typeof getMatchesForPosition>>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteTargetMatchId, setInviteTargetMatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleSendInvite = async (proposedTimes: string[]) => {
    if (!inviteTargetMatchId) return;
    setErrorMsg("");
    const result = await sendInterviewInvite(inviteTargetMatchId, session.company.id, proposedTimes);
    setInviteTargetMatchId(null);
    if ("error" in result) {
      setErrorMsg(result.error);
      return;
    }
    await refresh();
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6 md:px-10">
        <div className="py-16 text-center text-sm text-[#8A8A8A]">กำลังโหลด...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8A8A8A]">
          <p>ไม่พบตำแหน่งงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link href="/company/positions" className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับไปหน้าตำแหน่งงาน
          </Link>
        </div>
      </div>
    );
  }

  const { position, matches } = data;
  const inviteTarget = matches.find((m) => m.id === inviteTargetMatchId);

  return (
    <>
      <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6 md:px-10">
        <Link
          href={`/company/positions/${positionId}/candidates`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          กลับไปหน้าผู้สมัคร (mock)
        </Link>
        <h1 className="mt-2 text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
          {position.title} — ผู้สมัครจริงในระบบ
        </h1>
        <p className="mt-0.5 text-xs text-[#8A8A8A]">
          ข้อมูลจริงจากฐานข้อมูล (ไม่ใช่ mock) — หน้าชั่วคราวสำหรับทดสอบระบบแจ้งเตือน/นัดสัมภาษณ์
        </p>

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
              ยังไม่มีผู้สมัครที่แมทช์กับตำแหน่งนี้ในฐานข้อมูลจริง
            </div>
          ) : (
            matches.map((match) => {
              const slot = match.interviewSlot;
              return (
                <div key={match.id} className="rounded-2xl bg-[#FAFAFA] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[#0F0F0F]">{match.jobSeeker.name}</span>
                        {match.isStandout && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(245,217,73,0.25)] px-2 py-0.5 text-[10px] font-bold text-[#856700]">
                            <Star className="h-2.5 w-2.5 fill-current" strokeWidth={1.75} />
                            ช้างเผือก
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-[#8A8A8A]">{match.jobSeeker.email}</div>
                      {match.jobSeeker.profile && match.jobSeeker.profile.computerSkills.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {match.jobSeeker.profile.computerSkills.slice(0, 6).map((skill) => (
                            <span
                              key={skill}
                              className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-[#0F0F0F]">{match.matchScore}%</div>
                        <div className="text-[9px] text-[#8A8A8A]">Match</div>
                      </div>
                      {slot ? (
                        slot.status === "confirmed" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(59,245,92,0.15)] px-3 py-1.5 text-[10px] font-bold text-[#0f5c22]">
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                            ยืนยันแล้ว — {slot.confirmedTime}
                          </span>
                        ) : slot.status === "declined" ? (
                          <span className="rounded-full bg-[#F0F0F0] px-3 py-1.5 text-[10px] font-bold text-[#8A8A8A]">
                            ผู้สมัครปฏิเสธคำเชิญ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(77,124,255,0.12)] px-3 py-1.5 text-[10px] font-bold text-[#4D7CFF]">
                            <Clock className="h-3 w-3" strokeWidth={2} />
                            รอผู้สมัครตอบรับ
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInviteTargetMatchId(match.id)}
                          className="rounded-full bg-[#0F0F0F] px-3 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                        >
                          นัดสัมภาษณ์
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {inviteTarget && (
        <InterviewInviteModal
          candidateLabel={inviteTarget.jobSeeker.name}
          onClose={() => setInviteTargetMatchId(null)}
          onSubmit={handleSendInvite}
        />
      )}
    </>
  );
}
