"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Briefcase, Check, Clock, EyeOff, FileText, Mail, MapPin, Phone, Star, X } from "lucide-react";
import { InterviewInviteModal } from "@/components/InterviewInviteModal";
import { RadarChart } from "@/components/RadarChart";
import { getCandidateReport, sendInterviewInvite } from "@/lib/actions/interview";
import { useCompanySession } from "@/lib/companySession";
import { SOFT_SKILL_AXIS_META, SOFT_SKILL_AXIS_ORDER } from "@/lib/data";

type ReportData = Awaited<ReturnType<typeof getCandidateReport>>;

// Same status → color/icon mapping as /company/positions/[id]/candidates.
const INTERVIEW_STATUS_META = {
  pending: { label: "รอผู้สมัครยืนยัน", icon: Clock, className: "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]" },
  confirmed: { label: "ยืนยันนัดแล้ว", icon: Check, className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  declined: { label: "ปฏิเสธคำเชิญ", icon: X, className: "bg-[#F0F0F0] text-[#8A8A8A]" },
} as const;

// partial uses blue, not amber — amber is reserved for the "ช้างเผือก"
// standout badge above, which can appear on the same page.
const HARD_SKILL_STATUS_META = {
  verified: { label: "Verified", className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  partial: { label: "Partial", className: "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]" },
  unclear: { label: "Unclear", className: "bg-[#F0F0F0] text-[#8A8A8A]" },
} as const;

/** Same short-and-stable convention as /company/positions/[id]/candidates. */
function blindLabel(jobSeekerId: string): string {
  return `Candidate #${jobSeekerId.slice(-6).toUpperCase()}`;
}

export default function CandidateReportPage() {
  const params = useParams<{ id: string }>();
  const jobSeekerId = params.id;
  const session = useCompanySession();

  const [data, setData] = useState<ReportData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteTargetMatchId, setInviteTargetMatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // RadarChart takes a pixel `size` prop, not a CSS width — it computes
  // label font size, label wrap width, and dot radius directly from that
  // number, so a hardcoded size can't track the column it actually renders
  // in (full-width on mobile, half-width beside the stat cards on desktop).
  // Measuring the wrapper's real rendered width keeps all of that in sync
  // with whatever space is actually available instead of guessing per
  // breakpoint. A callback ref (not useRef + useEffect(..., [])) because the
  // wrapper only mounts once session/report finish loading, past the early
  // returns below — an effect with an empty dep array would fire once
  // against a still-null ref and never run again.
  //
  // RadarChart's axis labels are positioned *outside* its size×size box on
  // purpose (readability) — at size=s they can extend roughly another 0.5s
  // past each edge. Passing the wrapper's full measured width as `size`
  // left no room for that overflow once the chart sat directly beside the
  // stat-cards column (previously it had a whole page's margin to bleed
  // into), so labels spilled over and overlapped the cards. Scaling down to
  // 60% of the measured width reserves that headroom instead.
  const chartResizeObserverRef = useRef<ResizeObserver | null>(null);
  const [chartSize, setChartSize] = useState(230);
  const chartWrapRefCallback = (el: HTMLDivElement | null) => {
    chartResizeObserverRef.current?.disconnect();
    chartResizeObserverRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      const sideBySide = window.matchMedia("(min-width: 1024px)").matches;
      const ratio = sideBySide ? 0.55 : 0.68;
      const ceiling = sideBySide ? 320 : 250;
      setChartSize(Math.max(170, Math.min(ceiling, Math.floor(width * ratio))));
    });
    observer.observe(el);
    chartResizeObserverRef.current = observer;
  };

  const refresh = async () => {
    const fresh = await getCandidateReport(jobSeekerId, session.company.id);
    setData(fresh);
  };

  useEffect(() => {
    let cancelled = false;
    getCandidateReport(jobSeekerId, session.company.id).then((fresh) => {
      if (cancelled) return;
      setData(fresh);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobSeekerId/session.company.id stable for this page's lifetime
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
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="py-16 text-center text-sm text-[#8A8A8A]">กำลังโหลด...</div>
      </div>
    );
  }

  // Guard: this jobSeeker must have at least one match with this HR's
  // company (enforced inside getCandidateReport) — otherwise treat as
  // not-found rather than leaking that the candidate exists at all.
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8A8A8A]">
          <p>ไม่พบผู้สมัครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link href="/company/dashboard" className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับ Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { jobSeeker, nameRevealed, isStandout } = data;
  const displayName = nameRevealed ? jobSeeker.name : blindLabel(jobSeekerId);
  const currentWork = jobSeeker.profile?.workExperience.find((w) => w.isCurrent);
  const gameResult = jobSeeker.gameResult;
  const radarData = gameResult
    ? SOFT_SKILL_AXIS_ORDER.map((axis) => ({ axis: SOFT_SKILL_AXIS_META[axis].en, value: gameResult[axis] }))
    : [];
  const inviteTarget = jobSeeker.matches.find((m) => m.id === inviteTargetMatchId);

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="mx-auto w-full max-w-[720px]">
          <Link
            href="/company/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับ Dashboard
          </Link>

          {errorMsg && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Header */}
          <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {nameRevealed ? (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#0F0F0F] text-base font-extrabold text-white">
                  {jobSeeker.name.trim().charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0F0F0]">
                  <Image
                    src="/mascot/mascot-blind-candidate.png"
                    alt="ผู้สมัครที่ยังไม่เปิดเผยตัวตน (Blind Review)"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-extrabold tracking-[-0.02em]">{displayName}</h1>
                  {isStandout && (
                    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-[rgba(245,217,73,0.25)] px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#856700]">
                      <Star className="h-2.5 w-2.5 fill-current" strokeWidth={1.75} />
                      ช้างเผือก
                    </span>
                  )}
                </div>
                {!nameRevealed && (
                  <p className="inline-flex items-center gap-1 text-[11px] text-[#8A8A8A]">
                    <EyeOff className="h-3 w-3" strokeWidth={1.75} />
                    ชื่อจริงจะเปิดเผยเมื่อผู้สมัครยืนยันนัดสัมภาษณ์ (Blind Review)
                  </p>
                )}
              </div>
            </div>
          </div>

          {isStandout && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl bg-[rgba(245,217,73,0.1)] p-3.5 text-xs font-semibold text-[#856700]">
              <Star className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-current" strokeWidth={1.75} />
              <span>ผู้สมัครช้างเผือก — มี Match Score ตั้งแต่ 90% ขึ้นไปในอย่างน้อยหนึ่งตำแหน่ง</span>
            </div>
          )}

          {/* Contact & personal info — same Blind Review gate as the name */}
          <div className="mb-6 rounded-2xl bg-[#FAFAFA] p-4">
            <h2 className="mb-3 text-xs font-extrabold text-[#0F0F0F]">ข้อมูลส่วนตัว</h2>
            {nameRevealed ? (
              <div className="flex flex-col gap-2 text-xs text-[#0F0F0F]">
                {currentWork && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                    <span>
                      {currentWork.jobTitle} ที่ {currentWork.companyName}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <a href={`mailto:${jobSeeker.email}`} className="hover:underline">
                    {jobSeeker.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <span>{jobSeeker.profile?.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <span>{jobSeeker.profile?.province || "-"}</span>
                </div>
              </div>
            ) : (
              <p className="inline-flex items-start gap-1.5 text-[11px] text-[#8A8A8A]">
                <EyeOff className="mt-0.5 h-3 w-3 flex-shrink-0" strokeWidth={1.75} />
                ข้อมูลติดต่อและตำแหน่งงานปัจจุบันจะเปิดเผยเมื่อผู้สมัครยืนยันนัดสัมภาษณ์ (Blind Review) เช่นเดียวกับชื่อจริง
              </p>
            )}
          </div>

          {/* Resume — same Blind Review gate as contact info above, since
              work history/education can identify a candidate almost as
              directly as a name (company names, dates). Only the PDF's
              extracted TEXT is stored, never the original file (see
              /decoder's extractTextFromPdf) — there's no file storage wired
              up, so this shows the parsed text rather than an embedded PDF,
              same "resolves to exactly one of three states" logic already
              used on the candidate's own /profile page. */}
          {nameRevealed && (
            <div className="mb-6 rounded-2xl bg-[#FAFAFA] p-4">
              <h2 className="mb-3 text-xs font-extrabold text-[#0F0F0F]">เรซูเม่</h2>
              {jobSeeker.profile && jobSeeker.profile.resumeRawText.trim().length > 0 ? (
                <div className="rounded-xl bg-white p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#0F0F0F]">
                    <FileText className="h-4 w-4 flex-shrink-0 text-[#4D7CFF]" strokeWidth={2} />
                    ข้อความที่สกัดจากเรซูเม่ PDF ที่ผู้สมัครอัปโหลด
                  </div>
                  <p className="max-h-[240px] overflow-y-auto rounded-xl bg-[#FAFAFA] p-3 text-xs leading-relaxed whitespace-pre-wrap text-[#5C5C5C]">
                    {jobSeeker.profile.resumeRawText}
                  </p>
                </div>
              ) : jobSeeker.profile &&
                (jobSeeker.profile.desiredPosition ||
                  jobSeeker.profile.education.length > 0 ||
                  jobSeeker.profile.workExperience.length > 0) ? (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] text-[#8A8A8A]">ข้อมูลจากฟอร์มที่ผู้สมัครกรอกไว้ (ยังไม่ได้อัปโหลดเรซูเม่ PDF)</p>
                  {jobSeeker.profile.desiredPosition && (
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-[10px] font-bold text-[#8A8A8A]">ตำแหน่งงานที่สนใจ</div>
                      <div className="text-xs font-extrabold text-[#0F0F0F]">{jobSeeker.profile.desiredPosition}</div>
                    </div>
                  )}
                  {jobSeeker.profile.education.length > 0 && (
                    <div className="rounded-xl bg-white p-3">
                      <div className="mb-1.5 text-[10px] font-bold text-[#8A8A8A]">ประวัติการศึกษา</div>
                      <div className="flex flex-col gap-1">
                        {jobSeeker.profile.education.map((e) => (
                          <div key={e.id} className="text-xs text-[#0F0F0F]">
                            {e.level} · {e.institution}
                            {e.fieldOfStudy ? ` · สาขา${e.fieldOfStudy}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobSeeker.profile.workExperience.length > 0 && (
                    <div className="rounded-xl bg-white p-3">
                      <div className="mb-1.5 text-[10px] font-bold text-[#8A8A8A]">ประสบการณ์ทำงาน</div>
                      <div className="flex flex-col gap-1">
                        {jobSeeker.profile.workExperience.map((w) => (
                          <div key={w.id} className="text-xs text-[#0F0F0F]">
                            {w.jobTitle} · {w.companyName}
                            {w.isCurrent ? " (ปัจจุบัน)" : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#8A8A8A]">ผู้สมัครยังไม่มีเรซูเม่ในระบบ</p>
              )}
            </div>
          )}

          {/* Matches / interview actions */}
          <div className="mb-6 rounded-2xl bg-[#FAFAFA] p-4">
            <h2 className="mb-3 text-xs font-extrabold text-[#0F0F0F]">ตำแหน่งที่ Match ({jobSeeker.matches.length})</h2>
            <div className="flex flex-col gap-2">
              {jobSeeker.matches.map((m) => {
                const slot = m.interviewSlot;
                const InterviewStatusIcon = slot ? INTERVIEW_STATUS_META[slot.status as keyof typeof INTERVIEW_STATUS_META].icon : null;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0F0F0F]">{m.position.title}</div>
                      <div className="text-[10px] text-[#8A8A8A]">Match {m.matchScore}%</div>
                      {slot && slot.status === "pending" && (
                        <div className="mt-1 text-[10px] text-[#4D7CFF]">เสนอเวลา: {slot.proposedTimes.join(", ")}</div>
                      )}
                    </div>
                    {slot && InterviewStatusIcon ? (
                      slot.status === "confirmed" && slot.confirmedTime ? (
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
                        onClick={() => setInviteTargetMatchId(m.id)}
                        className="rounded-full bg-[#0F0F0F] px-3 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                      >
                        นัดสัมภาษณ์
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hard skills */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">Hard Skills</h2>
            {jobSeeker.chatVerifications.length === 0 ? (
              <p className="text-xs text-[#8A8A8A]">ไม่มีข้อมูล</p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FAFAFA] p-3">
                {jobSeeker.chatVerifications.map((h) => (
                  <div key={h.skill} className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2">
                    <span className="text-xs font-semibold text-[#0F0F0F]">{h.skill}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${HARD_SKILL_STATUS_META[h.status as keyof typeof HARD_SKILL_STATUS_META].className}`}
                    >
                      {HARD_SKILL_STATUS_META[h.status as keyof typeof HARD_SKILL_STATUS_META].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Soft skills radar — breaks out of the 720px reading column on
            purpose: it's a data widget, not prose, and the extra width is
            what makes the chart genuinely bigger/more prominent than the
            stat cards while still leaving the label-overflow margin that
            chartWrapRefCallback above relies on. Narrower and this would be
            right back to labels colliding with the cards column. */}
        <div className="mx-auto mb-6 w-full max-w-[960px]">
          <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">Soft Skills</h2>
          {!gameResult ? (
            // Honest empty state — no GameResult row yet means the
            // candidate hasn't played the psychometric games, not that
            // every axis genuinely scored 0 (same convention as /profile).
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] bg-[#FAFAFA] p-6 text-center">
              <p className="text-xs font-bold text-[#0F0F0F]">ยังไม่มีผลประเมิน Soft Skills</p>
              <p className="text-[11px] text-[#8A8A8A]">ผู้สมัครยังไม่ได้เล่นมินิเกมประเมินศักยภาพ</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#FAFAFA] p-4">
              <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-6">
                <div
                  ref={chartWrapRefCallback}
                  className="flex w-full max-w-[300px] flex-shrink-0 items-center justify-center lg:w-3/5 lg:max-w-none"
                >
                  <RadarChart data={radarData} size={chartSize} theme="mono" showLabels animate />
                </div>
                <div className="grid w-full grid-cols-2 gap-2 lg:w-2/5">
                  {radarData.map((d) => (
                    <div key={d.axis} className="rounded-xl bg-white p-2.5 text-center">
                      <div className="text-sm font-extrabold text-[#0F0F0F] sm:text-base">{d.value}%</div>
                      <div className="text-[9px] leading-snug text-[#8A8A8A] sm:text-[10px]">{d.axis}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-[720px]">
          {/* AI Summary */}
          <div className="mb-6">
            {jobSeeker.aiSummary ? (
              <div className="rounded-2xl bg-[rgba(77,124,255,0.06)] p-4 sm:p-5">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
                  <Image
                    src="/mascot/mascot-ai-summary.png"
                    alt=""
                    width={100}
                    height={100}
                    className="h-[clamp(64px,20vw,100px)] w-[clamp(64px,20vw,100px)] flex-shrink-0 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <h2 className="text-sm font-extrabold text-[#0F0F0F]">AI Summary</h2>
                      <span className="inline-flex max-w-full items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-bold whitespace-normal text-[#4D7CFF]">
                        วิเคราะห์โดยน้องตรงปก
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed break-words text-[#0F0F0F]">{jobSeeker.aiSummary.summaryText}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-4 text-center text-xs text-[#8A8A8A]">
                ยังไม่มี AI Summary — ผู้สมัครยังไม่ได้ให้น้องตรงปกช่วยสร้างเรซูเม่
              </div>
            )}
          </div>
        </div>
      </div>

      {inviteTarget && (
        <InterviewInviteModal
          candidateLabel={displayName}
          onClose={() => setInviteTargetMatchId(null)}
          onSubmit={handleSendInvite}
        />
      )}
    </>
  );
}
