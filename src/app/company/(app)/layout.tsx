"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyAppFooter } from "@/components/CompanyAppFooter";
import { CompanyAppNavbar } from "@/components/CompanyAppNavbar";
import { LoadingMascot } from "@/components/LoadingMascot";
import { getHRSessionData } from "@/lib/actions/company";
import { CompanySessionProvider, type CompanySession } from "@/lib/companySession";
import { clearHRSessionIds, getHRSessionIds } from "@/lib/hrSession";

/**
 * Shared shell for every authenticated HR page (dashboard, positions,
 * candidates, interviews). Centralizes the session-read + redirect-guard +
 * loading-fallback that used to be duplicated in each of those pages, and
 * renders CompanyAppNavbar here (not per-page) so it doesn't remount when
 * navigating between sibling routes.
 *
 * Session flow: only { hrUserId, companyId } live in localStorage (see
 * hrSession.ts) — real hrUser/company data is fetched fresh from the
 * database on mount via getHRSessionData, which also re-verifies hrUserId
 * actually belongs to companyId server-side, so a stale/tampered localStorage
 * value can't grant access to the wrong company.
 */
export default function CompanyAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<CompanySession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ids = getHRSessionIds();
    if (!ids) {
      router.replace("/company/login");
      return;
    }

    getHRSessionData(ids.hrUserId, ids.companyId).then((data) => {
      if (cancelled) return;
      if (!data) {
        clearHRSessionIds();
        router.replace("/company/login");
        return;
      }
      setSession(data);
      setChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked || !session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <LoadingMascot />
      </div>
    );
  }

  return (
    <CompanySessionProvider value={session}>
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <CompanyAppNavbar hrUser={session.hrUser} company={session.company} />
        <main className="flex-1">{children}</main>
        <CompanyAppFooter />
      </div>
    </CompanySessionProvider>
  );
}
