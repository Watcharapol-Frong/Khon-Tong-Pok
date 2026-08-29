"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, ChevronRight, Plus, Star, Users } from "lucide-react";
import { getDashboardSummary, getMatchCountsByPosition } from "@/lib/actions/interview";
import { getPositionsByCompany, type PositionWithSkills } from "@/lib/actions/position";
import { useCompanySession } from "@/lib/companySession";

type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
const EMPTY_SUMMARY: DashboardSummary = { totalMatchesCount: 0, standoutCandidates: [] };

const STATUS_META: Record<"open" | "closed", { label: string; className: string }> = {
  open: { label: "เปิดรับสมัคร", className: "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]" },
  closed: { label: "ปิดรับสมัครแล้ว", className: "bg-[#F0F0F0] text-[#8A8A8A]" },
};

export default function CompanyDashboardPage() {
  const session = useCompanySession();

  const [positions, setPositions] = useState<PositionWithSkills[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getPositionsByCompany(),
      getDashboardSummary(),
      getMatchCountsByPosition(),
    ]).then(([freshPositions, freshSummary, freshMatchCounts]) => {
      if (cancelled) return;
      setPositions(freshPositions);
      setSummary(freshSummary);
      setMatchCounts(freshMatchCounts);
      setIsLoadingPositions(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session.company.id is stable for the lifetime of this page (set once by the layout)
  }, []);

  const openPositionsCount = positions.filter((p) => p.status === "open").length;
  // Preview only — full management (create/edit/close, and the complete
  // list) lives on /company/positions via the navbar, so duplicating that
  // whole table here would just be the same data shown twice. Positions
  // come back creation-ordered (oldest first), so the last N are the newest.
  const recentPositions = [...positions].slice(-4).reverse();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
      <div className="mb-6">
        <h1 className="text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">แดชบอร์ด</h1>
        <p className="mt-0.5 text-xs text-[#8A8A8A]">
          {session.company.name} · {session.hrUser.name}
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FAFAFA] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white">
            <Briefcase className="h-4 w-4 text-[#0F0F0F]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-extrabold text-[#0F0F0F]">
            {isLoadingPositions ? "…" : openPositionsCount}
          </div>
          <div className="text-xs text-[#8A8A8A]">ตำแหน่งที่เปิดอยู่</div>
        </div>
        <div className="rounded-2xl bg-[#FAFAFA] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white">
            <Users className="h-4 w-4 text-[#0F0F0F]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-extrabold text-[#0F0F0F]">{summary.totalMatchesCount}</div>
          <div className="text-xs text-[#8A8A8A]">ผู้สมัคร Match รวมทุกตำแหน่ง</div>
        </div>
        <div className="rounded-2xl bg-[#FAFAFA] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white">
            <Star className="h-4 w-4 text-[#856700]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-extrabold text-[#0F0F0F]">{summary.standoutCandidates.length}</div>
          <div className="text-xs text-[#8A8A8A]">ผู้สมัครช้างเผือก</div>
        </div>
      </div>

      {/* Standout candidates alert */}
      {summary.standoutCandidates.length > 0 && (
        <div className="mb-6 flex items-center gap-3 overflow-hidden rounded-2xl bg-[rgba(245,217,73,0.1)] p-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0F0F0F]">
              <Star className="h-4 w-4 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
              พบผู้สมัครช้างเผือก ({summary.standoutCandidates.length})
            </div>
            <div className="flex flex-col gap-1.5">
              {summary.standoutCandidates.map((c) => (
                <Link
                  key={c.matchId}
                  href={`/company/candidates/${c.jobSeekerId}`}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0F0F0F] transition-colors hover:bg-[#FAFAFA]"
                >
                  <span>
                    Candidate #{c.jobSeekerId.slice(-6).toUpperCase()} · {c.positionTitle}
                  </span>
                  <span className="font-extrabold">{c.matchScore}%</span>
                </Link>
              ))}
            </div>
          </div>
          <Image
            src="/mascot/mascot-success.png"
            alt=""
            width={112}
            height={116}
            className="hidden h-[116px] w-[112px] flex-shrink-0 object-contain sm:block"
          />
        </div>
      )}

      {/* Positions preview — see recentPositions above for why this is
          capped rather than the full list. */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-[#0F0F0F]">ตำแหน่งงานล่าสุด</h2>
        <Link
          href="/company/positions?new=1"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F0F] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          สร้างตำแหน่งใหม่
        </Link>
      </div>

      {isLoadingPositions ? (
        <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
          กำลังโหลดตำแหน่งงาน...
        </div>
      ) : positions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
          <Image
            src="/mascot/mascot-start.png"
            alt=""
            width={120}
            height={120}
            className="h-[88px] w-[88px] object-contain"
          />
          ยังไม่มีตำแหน่งงาน — กด &quot;สร้างตำแหน่งใหม่&quot; เพื่อเริ่มต้น
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {recentPositions.map((position) => {
              const candidateCount = matchCounts[position.id] ?? 0;
              const statusKey = position.status === "open" ? "open" : "closed";
              return (
                <Link
                  key={position.id}
                  href={`/company/positions/${position.id}/candidates`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAFAFA] p-3.5 transition-colors hover:bg-[#F0F0F0]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-[#0F0F0F]">
                        {position.title}
                      </span>
                      <span
                        className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${STATUS_META[statusKey].className}`}
                      >
                        {STATUS_META[statusKey].label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      {candidateCount} ผู้สมัคร Match
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#8A8A8A]" strokeWidth={2} />
                </Link>
              );
            })}
          </div>

          <Link
            href="/company/positions"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0F0F0F] hover:underline"
          >
            ดูตำแหน่งงานทั้งหมด ({positions.length})
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </>
      )}
    </div>
  );
}
