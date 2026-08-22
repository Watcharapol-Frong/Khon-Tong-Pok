"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, Check, Clock, EyeOff, Mail, MapPin, Phone, Star } from "lucide-react";
import { InterviewInviteModal } from "@/components/InterviewInviteModal";
import { RadarChart } from "@/components/RadarChart";
import { createInterviewInvite, getCandidateReportSnapshot, subscribeToStore } from "@/lib/companyStore";
import { useCompanySession } from "@/lib/companySession";
import { SOFT_SKILL_AXIS_META } from "@/lib/data";
import type { HardSkillStatus, SoftSkillScores } from "@/lib/types";

const getServerNull = () => null;

// partial uses blue, not amber — amber is reserved for the "ช้างเผือก"
// standout badge above, which can appear on the same page.
const STATUS_META: Record<HardSkillStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  partial: { label: "Partial", className: "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]" },
  unclear: { label: "Unclear", className: "bg-[#F0F0F0] text-[#8A8A8A]" },
};

export default function CandidateReportPage() {
  const params = useParams<{ id: string }>();
  const jobSeekerId = params.id;
  const [inviteTargetPositionId, setInviteTargetPositionId] = useState<string | null>(null);

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
      // Side-by-side (lg+) has a stat-cards column right next to it, so it
      // keeps the bigger overflow reserve; stacked layout has nothing beside
      // it to collide with, so it can use more of its measured width.
      const sideBySide = window.matchMedia("(min-width: 1024px)").matches;
      const ratio = sideBySide ? 0.55 : 0.68;
      const ceiling = sideBySide ? 320 : 250;
      setChartSize(Math.max(170, Math.min(ceiling, Math.floor(width * ratio))));
    });
    observer.observe(el);
    chartResizeObserverRef.current = observer;
  };

  const session = useCompanySession();

  const report = useSyncExternalStore(
    subscribeToStore,
    () => getCandidateReportSnapshot(jobSeekerId, session.company.id),
    getServerNull
  );

  // Guard: this jobSeeker must have at least one match with this HR's
  // company (enforced inside getCandidateReport) — otherwise treat as
  // not-found rather than leaking that the candidate exists at all.
  if (!report) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8A8A8A]">
          <p>ไม่พบผู้สมัครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link
            href="/company/dashboard"
            className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับ Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const displayName = report.nameRevealed
    ? report.jobSeeker.realName
    : `Candidate #${jobSeekerId.replace(/^js_/, "").toUpperCase()}`;

  const radarData = (
    Object.entries(report.jobSeeker.softSkills) as [keyof SoftSkillScores, number | undefined][]
  )
    .filter((entry): entry is [keyof SoftSkillScores, number] => entry[1] !== undefined)
    .map(([key, value]) => ({ axis: SOFT_SKILL_AXIS_META[key].en, value }));

  const handleSendInvite = (proposedTimes: string[]) => {
    if (!inviteTargetPositionId) return;
    createInterviewInvite(inviteTargetPositionId, jobSeekerId, proposedTimes);
    setInviteTargetPositionId(null);
  };

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

          {/* Header */}
          <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {report.nameRevealed ? (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F0F0F0]">
                  <Image
                    src={report.jobSeeker.photoUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
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
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold tracking-[-0.02em]">{displayName}</h1>
                  {report.isStandout && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(245,217,73,0.25)] px-2.5 py-0.5 text-[10px] font-bold text-[#856700]">
                      <Star className="h-2.5 w-2.5 fill-current" strokeWidth={1.75} />
                      ช้างเผือก
                    </span>
                  )}
                </div>
                {!report.nameRevealed && (
                  <p className="inline-flex items-center gap-1 text-[11px] text-[#8A8A8A]">
                    <EyeOff className="h-3 w-3" strokeWidth={1.75} />
                    ชื่อจริงจะเปิดเผยเมื่อกดนัดสัมภาษณ์ (Blind Review)
                  </p>
                )}
              </div>
            </div>
          </div>

          {report.isStandout && (
            <div className="flex items-start gap-2 mb-6 rounded-2xl bg-[rgba(245,217,73,0.1)] p-3.5 text-xs font-semibold text-[#856700]">
              <Star className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-current" strokeWidth={1.75} />
              <span>ผู้สมัครช้างเผือก — มี Match Score ตั้งแต่ 90% ขึ้นไปในอย่างน้อยหนึ่งตำแหน่ง</span>
            </div>
          )}

          {/* Contact & personal info — same Blind Review gate as the name */}
          <div className="mb-6 rounded-2xl bg-[#FAFAFA] p-4">
            <h2 className="mb-3 text-xs font-extrabold text-[#0F0F0F]">ข้อมูลส่วนตัว</h2>
            {report.nameRevealed ? (
              <div className="flex flex-col gap-2 text-xs text-[#0F0F0F]">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <span>
                    {report.jobSeeker.currentRole} · ประสบการณ์{" "}
                    {report.jobSeeker.yearsOfExperience === 0
                      ? "จบใหม่"
                      : `${report.jobSeeker.yearsOfExperience} ปี`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <a href={`mailto:${report.jobSeeker.contact.email}`} className="hover:underline">
                    {report.jobSeeker.contact.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <a href={`tel:${report.jobSeeker.contact.phone}`} className="hover:underline">
                    {report.jobSeeker.contact.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                  <span>{report.jobSeeker.contact.location}</span>
                </div>
              </div>
            ) : (
              <p className="inline-flex items-start gap-1.5 text-[11px] text-[#8A8A8A]">
                <EyeOff className="mt-0.5 h-3 w-3 flex-shrink-0" strokeWidth={1.75} />
                ข้อมูลติดต่อและตำแหน่งงานปัจจุบันจะเปิดเผยเมื่อกดนัดสัมภาษณ์ (Blind Review) เช่นเดียวกับชื่อจริง
              </p>
            )}
          </div>

          {/* Matches / interview actions */}
          <div className="mb-6 rounded-2xl bg-[#FAFAFA] p-4">
            <h2 className="mb-3 text-xs font-extrabold text-[#0F0F0F]">
              ตำแหน่งที่ Match ({report.matches.length})
            </h2>
            <div className="flex flex-col gap-2">
              {report.matches.map((m) => (
                <div
                  key={m.positionId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F0F0F]">{m.positionTitle}</div>
                    <div className="text-[10px] text-[#8A8A8A]">Match {m.matchScore}%</div>
                    {m.proposedTimes && m.proposedTimes.length > 0 && (
                      <div className="mt-1 text-[10px] text-[#4D7CFF]">
                        เสนอเวลา: {m.proposedTimes.join(", ")}
                      </div>
                    )}
                  </div>
                  {m.proposedTimes ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(59,245,92,0.15)] px-3 py-1.5 text-[10px] font-bold text-[#0f5c22]">
                      <Clock className="h-3 w-3" strokeWidth={2} />
                      รอผู้สมัครยืนยัน
                    </span>
                  ) : m.status === "contacted" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(59,245,92,0.15)] px-3 py-1.5 text-[10px] font-bold text-[#0f5c22]">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      นัดสัมภาษณ์แล้ว
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInviteTargetPositionId(m.positionId)}
                      className="rounded-full bg-[#0F0F0F] px-3 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90"
                    >
                      นัดสัมภาษณ์
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hard skills */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">Hard Skills</h2>
            {report.jobSeeker.hardSkills.length === 0 ? (
              <p className="text-xs text-[#8A8A8A]">ไม่มีข้อมูล</p>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-2xl bg-[#FAFAFA] p-3">
                {report.jobSeeker.hardSkills.map((h) => (
                  <div
                    key={h.skill}
                    className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2"
                  >
                    <span className="text-xs font-semibold text-[#0F0F0F]">{h.skill}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_META[h.status].className}`}
                    >
                      {STATUS_META[h.status].label}
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
        <div className="mx-auto w-full max-w-[960px] mb-6">
          <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">Soft Skills</h2>
          {radarData.length === 0 ? (
            <p className="text-xs text-[#8A8A8A]">ไม่มีข้อมูล</p>
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
                      <div className="text-sm font-extrabold text-[#0F0F0F] sm:text-base">
                        {d.value}%
                      </div>
                      <div className="text-[9px] leading-snug text-[#8A8A8A] sm:text-[10px]">
                        {d.axis}
                      </div>
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
                  <p className="text-xs leading-relaxed break-words text-[#0F0F0F]">
                    {report.jobSeeker.aiSummary}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {inviteTargetPositionId && (
        <InterviewInviteModal
          candidateLabel={displayName}
          onClose={() => setInviteTargetPositionId(null)}
          onSubmit={handleSendInvite}
        />
      )}
    </>
  );
}
