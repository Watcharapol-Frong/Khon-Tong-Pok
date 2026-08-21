"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Pencil, User, X } from "lucide-react";
import {
  cancelInterviewInvite,
  confirmInterviewTime,
  getInterviewSlotsForCompanySnapshot,
  getSessionSnapshot,
  subscribeToStore,
} from "@/lib/companyStore";
import type { InterviewSlotStatus } from "@/lib/types";

const getServerSessionSnapshot = () => null;
const EMPTY_SLOTS: never[] = [];

const STATUS_META: Record<
  InterviewSlotStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: "รอผู้สมัครยืนยัน", icon: Clock, className: "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]" },
  confirmed: { label: "ยืนยันนัดแล้ว", icon: Check, className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  declined: { label: "ปฏิเสธคำเชิญ", icon: X, className: "bg-[#F0F0F0] text-[#8A8A8A]" },
};

export default function InterviewDetailPage() {
  const router = useRouter();
  const params = useParams<{ positionId: string; jobSeekerId: string }>();
  const { positionId, jobSeekerId } = params;

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

  // getInterviewSlotsForCompany already scopes to this HR's own company, so
  // reusing it here (same as the list page) doubles as the authorization
  // check — a matchId for another company's interview just won't be in it.
  const slots = useSyncExternalStore(
    subscribeToStore,
    () => (session ? getInterviewSlotsForCompanySnapshot(session.company.id) : EMPTY_SLOTS),
    () => EMPTY_SLOTS
  );

  // Times are informational by default — editing (to reschedule or set the
  // confirmed time) is an explicit action behind "แก้ไข", not the default
  // view. Reset whenever a different slot's page mounts.
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [armedCancel, setArmedCancel] = useState(false);

  if (!session) return null;

  const slot = slots.find((s) => s.matchId === `${positionId}::${jobSeekerId}`) ?? null;

  if (!slot) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[#8A8A8A]">
          <p>ไม่พบนัดสัมภาษณ์นี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Link
            href="/company/interviews"
            className="inline-flex items-center gap-1 font-bold text-[#0F0F0F] underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            กลับไปหน้านัดสัมภาษณ์ทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_META[slot.status].icon;
  /** datetime-local's value is "YYYY-MM-DDTHH:mm" — stored as "YYYY-MM-DD HH:mm" per InterviewSlot.proposedTimes. */
  const toProposedTimeString = (datetimeLocalValue: string) => datetimeLocalValue.replace("T", " ");
  const timeToSave = customTime ? toProposedTimeString(customTime) : selectedTime;

  const startEditing = () => {
    setSelectedTime(slot.confirmedTime ?? null);
    setCustomTime("");
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!timeToSave) return;
    confirmInterviewTime(positionId, jobSeekerId, timeToSave);
    setIsEditing(false);
  };

  const handleCancelInvite = () => {
    if (!armedCancel) {
      setArmedCancel(true);
      return;
    }
    cancelInterviewInvite(positionId, jobSeekerId);
    router.push("/company/interviews");
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <Link
          href="/company/interviews"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          กลับไปหน้านัดสัมภาษณ์ทั้งหมด
        </Link>

        <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
              {slot.jobSeeker.realName}
            </h1>
            <p className="mt-0.5 text-xs text-[#8A8A8A]">{slot.positionTitle}</p>
          </div>
          <span
            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold ${STATUS_META[slot.status].className}`}
          >
            <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
            {STATUS_META[slot.status].label}
          </span>
        </div>

        <div className="mb-6 rounded-2xl bg-[#FAFAFA] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-[#0F0F0F]">เวลานัดสัมภาษณ์</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#4D7CFF] hover:opacity-80"
              >
                <Pencil className="h-3 w-3" strokeWidth={2} />
                แก้ไข / เลื่อนนัด
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="text-xs text-[#0F0F0F]">
              <div className="text-[10px] font-bold text-[#8A8A8A]">เวลาที่เสนอ</div>
              <div className="mt-0.5 font-semibold">{slot.proposedTimes.join(", ")}</div>
              {slot.confirmedTime && (
                <>
                  <div className="mt-2 text-[10px] font-bold text-[#8A8A8A]">เวลาที่ยืนยันแล้ว</div>
                  <div className="mt-0.5 font-bold text-[#0f5c22]">{slot.confirmedTime}</div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {slot.proposedTimes.map((time) => {
                  const isSelected = !customTime && selectedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setSelectedTime(time);
                        setCustomTime("");
                      }}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-[#0F0F0F] text-white"
                          : "bg-white text-[#0F0F0F] hover:bg-[#F0F0F0]"
                      }`}
                    >
                      {time}
                      {slot.confirmedTime === time && (
                        <span className={isSelected ? "text-white" : "text-[#0f5c22]"}>
                          ยืนยันแล้ว
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <label className="mb-1.5 block text-[10px] font-bold text-[#8A8A8A]">
                  หรือเลื่อนนัดไปเวลาอื่น
                </label>
                <input
                  type="datetime-local"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0F0F0F] outline-none"
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!timeToSave}
                  className="flex-1 rounded-full bg-[#0F0F0F] py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                >
                  ปิด
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/company/candidates/${jobSeekerId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAFA] px-3.5 py-2 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
          >
            <User className="h-3.5 w-3.5" strokeWidth={2} />
            ดูโปรไฟล์ผู้สมัคร
          </Link>
          <button
            type="button"
            onClick={handleCancelInvite}
            className={`cursor-pointer rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
              armedCancel
                ? "bg-[#C0392B] text-white hover:opacity-90"
                : "bg-[#FAFAFA] text-[#C0392B] hover:bg-[#F0F0F0]"
            }`}
          >
            {armedCancel ? "ยืนยันยกเลิกคำเชิญ?" : "ยกเลิกคำเชิญ"}
          </button>
        </div>
      </div>
    </div>
  );
}
