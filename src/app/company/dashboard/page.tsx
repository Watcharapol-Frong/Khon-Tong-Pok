"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Plus, Star } from "lucide-react";
import { Footer } from "@/components/Footer";
import { LoadingMascot } from "@/components/LoadingMascot";
import { CompanyNavbar } from "@/components/CompanyNavbar";
import {
  clearHRSession,
  getCandidatesForPosition,
  getDashboardSummarySnapshot,
  getPositionsSnapshot,
  getSessionSnapshot,
  subscribeToStore,
} from "@/lib/companyStore";

const getServerSessionSnapshot = () => null;

export default function CompanyDashboardPage() {
  const router = useRouter();
  // See src/lib/companyStore.ts docstrings for why this uses
  // useSyncExternalStore + a fresh one-time redirect check instead of
  // useEffect+setState (avoids both a lint violation and a real bug where a
  // transient SSR-placeholder null value fires a premature redirect).
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

  const positions = session ? getPositionsSnapshot(session.company.id) : [];
  const summary = session ? getDashboardSummarySnapshot(session.company.id) : null;

  const handleLogout = () => {
    clearHRSession();
    router.push("/company/login");
  };

  if (!session || !summary) {
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
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(15,15,15,0.08)] pb-6">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-[#FAFAFA] px-3 py-0.5 text-[11px] font-bold text-[#5C5C5C]">
              <span className="h-2 w-2 rounded-full bg-[#4D7CFF]" />
              HR Dashboard
            </div>
            <h1 className="text-[clamp(22px,3.5vw,30px)] font-extrabold tracking-[-0.02em]">
              {session.company.name}
            </h1>
            <p className="mt-0.5 text-xs text-[#8A8A8A]">
              เข้าสู่ระบบในนาม {session.hrUser.name} ({session.hrUser.email})
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(15,15,15,0.15)] bg-white px-4 py-2 text-xs font-bold text-[#5C5C5C] transition-colors hover:bg-[#F5F5F5]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            ออกจากระบบ
          </button>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
            <div className="text-2xl font-extrabold text-[#0F0F0F]">
              {summary.openPositionsCount}
            </div>
            <div className="text-xs text-[#8A8A8A]">ตำแหน่งที่เปิดอยู่</div>
          </div>
          <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
            <div className="text-2xl font-extrabold text-[#0F0F0F]">
              {summary.totalMatchesCount}
            </div>
            <div className="text-xs text-[#8A8A8A]">ผู้สมัคร Match รวมทุกตำแหน่ง</div>
          </div>
        </div>

        {/* Standout candidates alert */}
        {summary.standoutCandidates.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[rgba(245,217,73,0.4)] bg-[rgba(245,217,73,0.1)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0F0F0F]">
              <Star className="h-4 w-4 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
              พบผู้สมัครช้างเผือก ({summary.standoutCandidates.length})
            </div>
            <div className="flex flex-col gap-1.5">
              {summary.standoutCandidates.map((c) => (
                <Link
                  key={c.jobSeeker.id}
                  href={`/company/candidates/${c.jobSeeker.id}`}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0F0F0F] transition-colors hover:bg-[#FAFAFA]"
                >
                  <span>
                    Candidate #{c.jobSeeker.id.replace(/^js_/, "").toUpperCase()} · {c.positionTitle}
                  </span>
                  <span className="font-extrabold">{c.matchScore}%</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Positions list */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#0F0F0F]">
            ตำแหน่งงานของบริษัท ({positions.length})
          </h2>
          <div className="flex gap-2">
            <Link
              href="/company/interviews"
              className="rounded-full border border-[rgba(15,15,15,0.15)] px-4 py-2 text-xs font-bold text-[#0F0F0F] hover:bg-[#F5F5F5]"
            >
              นัดสัมภาษณ์ทั้งหมด
            </Link>
            <Link
              href="/company/positions"
              className="rounded-full border border-[rgba(15,15,15,0.15)] px-4 py-2 text-xs font-bold text-[#0F0F0F] hover:bg-[#F5F5F5]"
            >
              จัดการตำแหน่งงาน
            </Link>
            <Link
              href="/company/positions?new=1"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F0F] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              สร้างตำแหน่งใหม่
            </Link>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            ยังไม่มีตำแหน่งงาน — กด &quot;สร้างตำแหน่งใหม่&quot; เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {positions.map((position) => {
              const candidateCount = getCandidatesForPosition(position.id).length;
              return (
                <Link
                  key={position.id}
                  href={`/company/positions/${position.id}/candidates`}
                  className="flex items-center justify-between rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white px-4 py-3 transition-colors hover:border-[rgba(15,15,15,0.25)]"
                >
                  <div>
                    <div className="text-sm font-extrabold text-[#0F0F0F]">{position.title}</div>
                    <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      {candidateCount} ผู้สมัคร Match · {position.open ? "เปิดรับสมัคร" : "ปิดรับสมัครแล้ว"}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#0F0F0F]">
                    ดูผู้สมัคร
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
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
