"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Briefcase, ChevronRight, Plus, Star, Users } from "lucide-react";
import {
  getCandidatesForPosition,
  getDashboardSummarySnapshot,
  getPositionsSnapshot,
  getSessionSnapshot,
  subscribeToStore,
} from "@/lib/companyStore";

const getServerSessionSnapshot = () => null;

const STATUS_META: Record<"open" | "closed", { label: string; className: string }> = {
  open: { label: "เปิดรับสมัคร", className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  closed: { label: "ปิดรับสมัครแล้ว", className: "bg-[#F0F0F0] text-[#8A8A8A]" },
};

export default function CompanyDashboardPage() {
  // (app)/layout.tsx already guards against no-session and redirects to
  // /company/login before this page ever mounts — this second read is just
  // to type-narrow and access session.company.id for this page's own data.
  const session = useSyncExternalStore(
    subscribeToStore,
    getSessionSnapshot,
    getServerSessionSnapshot
  );
  if (!session) return null;

  const positions = getPositionsSnapshot(session.company.id);
  const summary = getDashboardSummarySnapshot(session.company.id);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
      <div className="mb-6">
        <h1 className="text-[clamp(20px,3vw,26px)] font-extrabold tracking-[-0.02em]">แดชบอร์ด</h1>
        <p className="mt-0.5 text-xs text-[#8A8A8A]">
          {session.company.name} · {session.hrUser.name}
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-[rgba(15,15,15,0.08)]">
            <Briefcase className="h-4 w-4 text-[#0F0F0F]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-extrabold text-[#0F0F0F]">{summary.openPositionsCount}</div>
          <div className="text-xs text-[#8A8A8A]">ตำแหน่งที่เปิดอยู่</div>
        </div>
        <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-[rgba(15,15,15,0.08)]">
            <Users className="h-4 w-4 text-[#0F0F0F]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-extrabold text-[#0F0F0F]">{summary.totalMatchesCount}</div>
          <div className="text-xs text-[#8A8A8A]">ผู้สมัคร Match รวมทุกตำแหน่ง</div>
        </div>
        <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-[rgba(15,15,15,0.08)]">
            <Star className="h-4 w-4 text-[#856700]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-extrabold text-[#0F0F0F]">{summary.standoutCandidates.length}</div>
          <div className="text-xs text-[#8A8A8A]">ผู้สมัครช้างเผือก</div>
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

      {/* Positions table */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-[#0F0F0F]">ตำแหน่งงานของบริษัท ({positions.length})</h2>
        <Link
          href="/company/positions?new=1"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F0F] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          สร้างตำแหน่งใหม่
        </Link>
      </div>

      {positions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
          ยังไม่มีตำแหน่งงาน — กด &quot;สร้างตำแหน่งใหม่&quot; เพื่อเริ่มต้น
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[rgba(15,15,15,0.1)]">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="bg-[#FAFAFA] text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                <th className="px-4 py-3 font-bold">ตำแหน่งงาน</th>
                <th className="px-4 py-3 font-bold">สถานะ</th>
                <th className="px-4 py-3 font-bold">ผู้สมัคร Match</th>
                <th className="px-4 py-3 font-bold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const candidateCount = getCandidatesForPosition(position.id).length;
                const statusKey = position.open ? "open" : "closed";
                return (
                  <tr
                    key={position.id}
                    className="border-t border-[rgba(15,15,15,0.06)] bg-white transition-colors hover:bg-[#FAFAFA]"
                  >
                    <td className="px-4 py-3 text-sm font-bold text-[#0F0F0F]">{position.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_META[statusKey].className}`}
                      >
                        {STATUS_META[statusKey].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#5C5C5C]">{candidateCount} คน</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/company/positions/${position.id}/candidates`}
                        className="inline-flex items-center gap-0.5 text-xs font-bold text-[#0F0F0F] hover:underline"
                      >
                        ดูผู้สมัคร
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
