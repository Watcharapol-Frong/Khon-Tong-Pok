"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { LoadingMascot } from "@/components/LoadingMascot";
import { CompanyNavbar } from "@/components/CompanyNavbar";
import {
  getInterviewSlotsForCompanySnapshot,
  getSessionSnapshot,
  subscribeToStore,
} from "@/lib/companyStore";
import type { InterviewSlotStatus } from "@/lib/types";

const getServerSessionSnapshot = () => null;
// Stable reference — a fresh `[]` literal returned from getSnapshot/
// getServerSnapshot on every call trips React's "should be cached to avoid
// an infinite loop" warning, since arrays are compared by reference.
const EMPTY_SLOTS: never[] = [];

const STATUS_META: Record<
  InterviewSlotStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: "รอผู้สมัครยืนยัน", icon: Clock, className: "bg-[rgba(245,217,73,0.2)] text-[#856700]" },
  confirmed: { label: "ยืนยันนัดแล้ว", icon: Check, className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  declined: { label: "ปฏิเสธคำเชิญ", icon: X, className: "bg-[#F0F0F0] text-[#8A8A8A]" },
};

export default function CompanyInterviewsPage() {
  const router = useRouter();
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

  const slots = useSyncExternalStore(
    subscribeToStore,
    () => (session ? getInterviewSlotsForCompanySnapshot(session.company.id) : EMPTY_SLOTS),
    () => EMPTY_SLOTS
  );

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <CompanyNavbar />
        <LoadingMascot />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <CompanyNavbar />

      <div className="mx-auto w-full max-w-[900px] flex-1 px-4 py-10 sm:px-6 md:px-8">
        <Link
          href="/company/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          กลับ Dashboard
        </Link>
        <h1 className="mt-1 mb-1 text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
          นัดสัมภาษณ์ทั้งหมด
        </h1>
        <p className="mb-6 text-xs text-[#8A8A8A]">
          คำเชิญสัมภาษณ์ที่ส่งไปแล้ว ({slots.length}) — สถานะ &quot;รอผู้สมัครยืนยัน&quot; จะยังคงค้างไว้แบบนี้ก่อน เพราะฝั่งผู้สมัครยังไม่มีหน้าตอบรับ (อยู่ใน backlog)
        </p>

        {slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            ยังไม่มีการนัดสัมภาษณ์ — กด &quot;นัดสัมภาษณ์&quot; จากหน้ารายชื่อผู้สมัครของแต่ละตำแหน่ง
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {slots.map((slot) => {
              const StatusIcon = STATUS_META[slot.status].icon;
              return (
                <Link
                  key={slot.matchId}
                  href={`/company/candidates/${slot.jobSeeker.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-4 transition-colors hover:border-[rgba(15,15,15,0.25)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0F0F0F]">
                      {slot.jobSeeker.realName}
                    </div>
                    <div className="text-[11px] text-[#8A8A8A]">{slot.positionTitle}</div>
                    <div className="mt-1 text-[10px] text-[#4D7CFF]">
                      เสนอเวลา: {slot.proposedTimes.join(", ")}
                    </div>
                    {slot.confirmedTime && (
                      <div className="mt-0.5 text-[10px] font-bold text-[#0f5c22]">
                        ยืนยันเวลา: {slot.confirmedTime}
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold ${STATUS_META[slot.status].className}`}
                  >
                    <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
                    {STATUS_META[slot.status].label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
