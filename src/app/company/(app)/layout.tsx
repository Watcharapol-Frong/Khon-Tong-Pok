"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CompanyAppFooter } from "@/components/CompanyAppFooter";
import { CompanyAppNavbar } from "@/components/CompanyAppNavbar";
import { LoadingMascot } from "@/components/LoadingMascot";
import { getSessionSnapshot, subscribeToStore } from "@/lib/companyStore";

const getServerSessionSnapshot = () => null;

/**
 * Shared shell for every authenticated HR page (dashboard, positions,
 * candidates, interviews). Centralizes the session-read + redirect-guard +
 * loading-fallback that used to be duplicated in each of those 5 pages, and
 * renders CompanyAppNavbar here (not per-page) so it doesn't remount when
 * navigating between sibling routes — the actual point of using a Next.js
 * layout instead of wrapping each page individually.
 */
export default function CompanyAppLayout({ children }: { children: React.ReactNode }) {
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

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <LoadingMascot />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <CompanyAppNavbar hrUser={session.hrUser} company={session.company} />
      <main className="flex-1">{children}</main>
      <CompanyAppFooter />
    </div>
  );
}
