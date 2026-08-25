"use client";

import { createContext, useContext } from "react";
import type { Company, HRUser } from "@prisma/client";

/** HRUser minus the plaintext password field — never sent to the client. See createCompany/joinExistingCompany/loginHR/getHRSessionData in src/lib/actions/company.ts, all of which strip it before returning. */
export type SafeHRUser = Omit<HRUser, "password">;

export type CompanySession = { hrUser: SafeHRUser; company: Company };

const CompanySessionContext = createContext<CompanySession | null>(null);

/** Provided once by CompanyAppLayout after it resolves the session from the ids in localStorage (see src/lib/hrSession.ts) — every authenticated HR page reads it via useCompanySession() instead of re-deriving its own session. */
export function CompanySessionProvider({
  value,
  children,
}: {
  value: CompanySession;
  children: React.ReactNode;
}) {
  return <CompanySessionContext.Provider value={value}>{children}</CompanySessionContext.Provider>;
}

/** Only valid inside CompanyAppLayout's subtree — that layout never renders children until a session is resolved, so the null case here is a programmer-error guard (used outside the layout), not a real runtime state to handle. */
export function useCompanySession(): CompanySession {
  const session = useContext(CompanySessionContext);
  if (!session) {
    throw new Error("useCompanySession must be used within CompanyAppLayout");
  }
  return session;
}
