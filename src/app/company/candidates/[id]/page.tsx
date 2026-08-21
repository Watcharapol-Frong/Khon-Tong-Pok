"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Check, Clock, EyeOff, Mail, MapPin, Phone, Star } from "lucide-react";
import { Footer } from "@/components/Footer";
import { InterviewInviteModal } from "@/components/InterviewInviteModal";
import { LoadingMascot } from "@/components/LoadingMascot";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import {
  createInterviewInvite,
  getCandidateReportSnapshot,
  getSessionSnapshot,
  subscribeToStore,
} from "@/lib/companyStore";
import { SOFT_SKILL_AXIS_META } from "@/lib/data";
import type { HardSkillStatus, SoftSkillScores } from "@/lib/types";

const getServerSessionSnapshot = () => null;
const getServerNull = () => null;

const STATUS_META: Record<HardSkillStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  partial: { label: "Partial", className: "bg-[rgba(245,217,73,0.2)] text-[#856700]" },
  unclear: { label: "Unclear", className: "bg-[#F0F0F0] text-[#8A8A8A]" },
};

// Once Blind Review lifts there's still no real photo upload in this mock
// app — an initial-letter avatar in a deterministic brand color (same
// palette as SOFT_SKILL_AXIS_META) is an honest stand-in rather than a fake
// photo, and gives each revealed candidate a stable, recognizable color.
const AVATAR_PALETTE = ["#FF6E5C", "#3BF55C", "#4D7CFF", "#F5D949", "#B14DFF", "#FF5CA8"];
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export default function CandidateReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobSeekerId = params.id;
  const [inviteTargetPositionId, setInviteTargetPositionId] = useState<string | null>(null);

  const session = useSyncExternalStore(
    subscribeToStore,
    getSessionSnapshot,
    getServerSessionSnapshot
  );

  useEffect(() => {
    if (getSessionSnapshot() === null) {
      router.replace("/company/login");
    }
  }, [router]);

  const report = useSyncExternalStore(
    subscribeToStore,
    () => (session ? getCandidateReportSnapshot(jobSeekerId, session.company.id) : null),
    getServerNull
  );

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <Navbar />
        <LoadingMascot />
        <Footer />
      </div>
    );
  }

  // Guard: this jobSeeker must have at least one match with this HR's
  // company (enforced inside getCandidateReport) — otherwise treat as
  // not-found rather than leaking that the candidate exists at all.
  if (!report) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[#8A8A8A]">
          <p>ไม่พบผู้สมัครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link
            href="/company/dashboard"
            className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับ Dashboard
          </Link>
        </div>
        <Footer />
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
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-6 md:px-8">
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
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-extrabold"
                style={{
                  backgroundColor: `${avatarColorFor(jobSeekerId)}26`,
                  color: avatarColorFor(jobSeekerId),
                }}
              >
                {displayName.charAt(0)}
              </div>
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#F0F0F0] text-xs font-extrabold text-[#5A5A5A]">
                #{jobSeekerId.replace(/^js_/, "").toUpperCase()}
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
          <div className="flex items-start gap-2 mb-6 rounded-2xl border border-[rgba(245,217,73,0.4)] bg-[rgba(245,217,73,0.1)] p-3.5 text-xs font-semibold text-[#856700]">
            <Star className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-current" strokeWidth={1.75} />
            <span>ผู้สมัครช้างเผือก — มี Match Score ตั้งแต่ 90% ขึ้นไปในอย่างน้อยหนึ่งตำแหน่ง</span>
          </div>
        )}

        {/* Contact & personal info — same Blind Review gate as the name */}
        <div className="mb-6 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
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
        <div className="mb-6 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
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
            <div className="flex flex-col gap-1.5">
              {report.jobSeeker.hardSkills.map((h) => (
                <div
                  key={h.skill}
                  className="flex items-center justify-between rounded-xl border border-[rgba(15,15,15,0.08)] bg-white px-3.5 py-2"
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

        {/* Soft skills radar */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">Soft Skills</h2>
          {radarData.length === 0 ? (
            <p className="text-xs text-[#8A8A8A]">ไม่มีข้อมูล</p>
          ) : (
            <div className="rounded-2xl border border-[rgba(15,15,15,0.08)] bg-[#FAFAFA] p-4">
              <div className="flex justify-center">
                <RadarChart data={radarData} size={280} theme="mono" showLabels animate />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {radarData.map((d) => (
                  <div
                    key={d.axis}
                    className="rounded-xl border border-[rgba(15,15,15,0.08)] bg-white p-2.5 text-center"
                  >
                    <div className="text-sm font-extrabold text-[#0F0F0F]">{d.value}%</div>
                    <div className="text-[10px] leading-snug text-[#8A8A8A]">{d.axis}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Image
              src="/mascot/mascot-ai-thinking.png"
              alt=""
              width={28}
              height={28}
              className="flex-shrink-0"
            />
            <h2 className="text-sm font-extrabold text-[#0F0F0F]">AI Summary</h2>
          </div>
          <div className="rounded-2xl border border-[rgba(77,124,255,0.2)] bg-[rgba(77,124,255,0.06)] p-4 text-xs leading-relaxed text-[#0F0F0F]">
            {report.jobSeeker.aiSummary}
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

      <Footer />
    </div>
  );
}
