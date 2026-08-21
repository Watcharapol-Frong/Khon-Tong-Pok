import type {
  Company,
  HRUser,
  InterviewSlot,
  JobSeeker,
  Match,
  MatchStatus,
  Position,
  SoftSkillScores,
} from "./types";
import {
  MOCK_COMPANIES,
  MOCK_HR_USERS,
  MOCK_JOB_SEEKERS,
  MOCK_MATCHES,
  MOCK_POSITIONS,
} from "./data";

/**
 * Client-side-only mock persistence for the company/HR side (no backend —
 * this app has no database). Data lives in localStorage, seeded once from
 * the MOCK_* arrays in data.ts, and mutated in place from then on.
 *
 * Passwords are mock/demo-only: stored in plaintext in an internal
 * `credentials` array that's never exposed as part of the public HRUser
 * type (kept out of types.ts on purpose, since real password fields have no
 * business living in generic display/state types). All seeded HR accounts
 * use the password "demo1234".
 */

const STORE_KEY = "ktp_company_store";
const SESSION_KEY = "ktp_hr_session";
const SEED_PASSWORD = "demo1234";

// Bump whenever CompanyStoreData's shape changes, OR whenever the *content*
// of a nested field changes in a way isValidStoreShape() can't detect (e.g.
// Position.requiredSoftSkills / JobSeeker.softSkills switching from the old
// 4-key soft-skill taxonomy to the current 6-axis one — isValidStoreShape()
// only checks that these are arrays, not what keys their objects contain, so
// a stale pre-migration blob would otherwise load "successfully" and then
// crash the first time code looks up a key that no longer exists).
// readStore() reseeds from scratch on a mismatch rather than attempting a
// partial migration — this is disposable mock/demo data (no backend), so a
// stale shape isn't worth reconciling field-by-field.
const SCHEMA_VERSION = 5;

type Credential = { hrUserId: string; password: string };

type CompanyStoreData = {
  version: number;
  companies: Company[];
  hrUsers: HRUser[];
  positions: Position[];
  matches: Match[];
  jobSeekers: JobSeeker[];
  credentials: Credential[];
  interviewSlots: InterviewSlot[];
};

/** `Match` has no id of its own — it's keyed by this (positionId, jobSeekerId) pair. */
function getMatchId(positionId: string, jobSeekerId: string): string {
  return `${positionId}::${jobSeekerId}`;
}

type HRSession = { hrUserId: string };

function isBrowser() {
  return typeof window !== "undefined";
}

function seedStore(): CompanyStoreData {
  return {
    version: SCHEMA_VERSION,
    companies: [...MOCK_COMPANIES],
    hrUsers: [...MOCK_HR_USERS],
    positions: [...MOCK_POSITIONS],
    matches: [...MOCK_MATCHES],
    jobSeekers: [...MOCK_JOB_SEEKERS],
    credentials: MOCK_HR_USERS.map((u) => ({ hrUserId: u.id, password: SEED_PASSWORD })),
    interviewSlots: [],
  };
}

/**
 * Checks the actual shape, not just the stamped `version` number — a
 * matching version doesn't guarantee a matching shape (e.g. data written
 * during a partial deploy/HMR reload where SCHEMA_VERSION had been bumped
 * but seedStore() hadn't yet been updated with the new field). That exact
 * scenario produced a real "version: 3, missing interviewSlots" blob once
 * already, so this validates every expected array field directly instead of
 * trusting the version alone.
 */
function isValidStoreShape(data: unknown): data is CompanyStoreData {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<CompanyStoreData>;
  return (
    d.version === SCHEMA_VERSION &&
    Array.isArray(d.companies) &&
    Array.isArray(d.hrUsers) &&
    Array.isArray(d.positions) &&
    Array.isArray(d.matches) &&
    Array.isArray(d.jobSeekers) &&
    Array.isArray(d.credentials) &&
    Array.isArray(d.interviewSlots)
  );
}

function readStore(): CompanyStoreData {
  if (!isBrowser()) return seedStore();
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    const seeded = seedStore();
    writeStore(seeded);
    return seeded;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoreShape(parsed)) {
      const seeded = seedStore();
      writeStore(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = seedStore();
    writeStore(seeded);
    return seeded;
  }
}

function writeStore(store: CompanyStoreData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

// --- change notification, for React's useSyncExternalStore ---
// (localStorage only fires a native "storage" event for *other* tabs, so
// same-tab mutations need to notify subscribers manually.)

const listeners = new Set<() => void>();
let storeVersion = 0;

function notify() {
  storeVersion++;
  for (const listener of listeners) listener();
}

export function subscribeToStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Wraps a pure read function so repeated calls within the same store
 * version return a referentially stable result — required by
 * useSyncExternalStore's getSnapshot (it must not appear to change on every
 * call, or React treats every render as a store update and can loop).
 * Must only wrap functions that don't mutate the store.
 */
function memoPerVersion<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  let cachedVersion = -1;
  let cache = new Map<string, Result>();
  return (...args: Args): Result => {
    if (cachedVersion !== storeVersion) {
      cachedVersion = storeVersion;
      cache = new Map();
    }
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key) as Result;
  };
}

// --- companies / domain lookup ---

export function findCompanyByDomain(domain: string): Company | null {
  const normalized = domain.trim().toLowerCase();
  return readStore().companies.find((c) => c.domain === normalized) ?? null;
}

export function checkEmailDomain(email: string): Company | null {
  return findCompanyByDomain(emailDomain(email));
}

/**
 * Registers a new HR account. If the email's domain matches an existing
 * company, the account joins that company (companyName is ignored). If the
 * domain is new, companyName is required and a new Company is created.
 */
export function registerOrJoinCompany(input: {
  email: string;
  password: string;
  hrName: string;
  companyName?: string;
  industry?: string;
}): { hrUser: HRUser; company: Company } | { error: string } {
  const store = readStore();
  const domain = emailDomain(input.email);
  if (!domain) return { error: "อีเมลไม่ถูกต้อง" };

  let company = store.companies.find((c) => c.domain === domain);

  if (!company) {
    if (!input.companyName?.trim()) {
      return { error: "กรุณากรอกชื่อบริษัท" };
    }
    company = {
      id: genId("co"),
      name: input.companyName.trim(),
      industry: input.industry?.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
      domain,
    };
    store.companies.push(company);
  }

  const hrUser: HRUser = {
    id: genId("hr"),
    companyId: company.id,
    name: input.hrName,
    email: input.email.trim(),
  };
  store.hrUsers.push(hrUser);
  store.credentials.push({ hrUserId: hrUser.id, password: input.password });

  writeStore(store);
  notify();
  return { hrUser, company };
}

export function loginHR(email: string, password: string): HRUser | { error: string } {
  const store = readStore();
  const normalized = email.trim().toLowerCase();
  const hrUser = store.hrUsers.find((u) => u.email.toLowerCase() === normalized);
  if (!hrUser) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };

  const credential = store.credentials.find((c) => c.hrUserId === hrUser.id);
  if (!credential || credential.password !== password) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }
  return hrUser;
}

export function setHRSession(hrUserId: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ hrUserId } satisfies HRSession));
  notify();
}

export function clearHRSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
  notify();
}

function computeSession(): { hrUser: HRUser; company: Company } | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  let session: HRSession;
  try {
    session = JSON.parse(raw) as HRSession;
  } catch {
    return null;
  }

  const store = readStore();
  const hrUser = store.hrUsers.find((u) => u.id === session.hrUserId);
  if (!hrUser) return null;
  const company = store.companies.find((c) => c.id === hrUser.companyId);
  if (!company) return null;

  return { hrUser, company };
}

export function getSession(): { hrUser: HRUser; company: Company } | null {
  return computeSession();
}

export const getSessionSnapshot = memoPerVersion(computeSession);

// --- positions ---

export function getPositionsByCompany(companyId: string): Position[] {
  return readStore().positions.filter((p) => p.companyId === companyId);
}

export const getPositionsSnapshot = memoPerVersion(getPositionsByCompany);

export function getPosition(positionId: string): Position | null {
  return readStore().positions.find((p) => p.id === positionId) ?? null;
}

export const getPositionSnapshot = memoPerVersion(getPosition);

export function createPosition(input: Omit<Position, "id">): Position {
  const store = readStore();
  const position: Position = { ...input, id: genId("pos") };
  store.positions.push(position);
  writeStore(store);
  notify();
  return position;
}

export function updatePosition(
  id: string,
  patch: Partial<Omit<Position, "id" | "companyId">>
): Position | null {
  const store = readStore();
  const idx = store.positions.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  store.positions[idx] = { ...store.positions[idx], ...patch };
  writeStore(store);
  notify();
  return store.positions[idx];
}

export function setPositionOpen(id: string, open: boolean): Position | null {
  return updatePosition(id, { open });
}

// --- matching ---

/** 0-100: 60% weighted on hard-skill verification level, 40% on how close softSkills are to the position's thresholds. Positions with no requirements on one side fall back fully on the other. */
export function computeMatchScore(position: Position, jobSeeker: JobSeeker): number {
  const hardTotal = position.requiredHardSkills.length;
  const hardMatched = position.requiredHardSkills.reduce((sum, skill) => {
    const found = jobSeeker.hardSkills.find((h) => h.skill === skill);
    if (!found) return sum;
    if (found.status === "verified") return sum + 1;
    if (found.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  const hardScore = hardTotal > 0 ? (hardMatched / hardTotal) * 100 : null;

  const softDims = (Object.entries(position.requiredSoftSkills) as [keyof SoftSkillScores, number | undefined][])
    .filter((entry): entry is [keyof SoftSkillScores, number] => entry[1] !== undefined);
  const softScore =
    softDims.length > 0
      ? softDims.reduce((sum, [dim, required]) => {
          const actual = jobSeeker.softSkills[dim] ?? 0;
          return sum + Math.min(100, (actual / required) * 100);
        }, 0) / softDims.length
      : null;

  if (hardScore === null && softScore === null) return 50;
  if (hardScore === null) return Math.round(softScore!);
  if (softScore === null) return Math.round(hardScore);
  return Math.round(hardScore * 0.6 + softScore * 0.4);
}

/** Match is "standout" (🐘) at 90+ — no stored flag, always derived from the current score so it can't drift out of sync with the position's requirements. */
export function isStandoutScore(matchScore: number): boolean {
  return matchScore >= 90;
}

/** Mutates the store to create any missing Match records for this position (one per known JobSeeker), scored via computeMatchScore. Call from an effect, not from a getSnapshot-wrapped read — see memoPerVersion's docstring. */
export function ensureMatchesForPosition(positionId: string): void {
  const store = readStore();
  const position = store.positions.find((p) => p.id === positionId);
  if (!position) return;

  const existingSeekerIds = new Set(
    store.matches.filter((m) => m.positionId === positionId).map((m) => m.jobSeekerId)
  );
  const missing = store.jobSeekers.filter((js) => !existingSeekerIds.has(js.id));
  if (missing.length === 0) return;

  for (const jobSeeker of missing) {
    store.matches.push({
      positionId,
      jobSeekerId: jobSeeker.id,
      matchScore: computeMatchScore(position, jobSeeker),
      status: "pending",
    });
  }
  writeStore(store);
  notify();
}

export type CandidateMatch = Match & { jobSeeker: JobSeeker; isStandout: boolean };

/** Pure read — call ensureMatchesForPosition first (from an effect) so every JobSeeker has a record. */
export function getCandidatesForPosition(positionId: string): CandidateMatch[] {
  const store = readStore();
  const jobSeekersById = new Map(store.jobSeekers.map((js) => [js.id, js]));
  return store.matches
    .filter((m) => m.positionId === positionId)
    .map((m) => {
      const jobSeeker = jobSeekersById.get(m.jobSeekerId);
      if (!jobSeeker) return null;
      return { ...m, jobSeeker, isStandout: isStandoutScore(m.matchScore) };
    })
    .filter((c): c is CandidateMatch => c !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export const getCandidatesSnapshot = memoPerVersion(getCandidatesForPosition);

export function updateMatchStatus(
  positionId: string,
  jobSeekerId: string,
  status: MatchStatus
): Match | null {
  const store = readStore();
  const idx = store.matches.findIndex(
    (m) => m.positionId === positionId && m.jobSeekerId === jobSeekerId
  );
  if (idx === -1) return null;
  store.matches[idx] = { ...store.matches[idx], status };
  writeStore(store);
  notify();
  return store.matches[idx];
}

// --- interview invites ---
// HR side only for now — see InterviewSlot's docstring in types.ts for what's
// deliberately not built yet (candidate-facing accept/decline, real
// notifications, auto-"confirmed").

export function getInterviewSlot(positionId: string, jobSeekerId: string): InterviewSlot | null {
  const matchId = getMatchId(positionId, jobSeekerId);
  return readStore().interviewSlots.find((s) => s.matchId === matchId) ?? null;
}

export const getInterviewSlotSnapshot = memoPerVersion(getInterviewSlot);

/**
 * Sends an interview invite: creates the InterviewSlot (status "pending")
 * and marks the underlying Match as "contacted" in the same write, so the
 * two can't drift apart into an inconsistent combination. Re-sending to an
 * already-invited match replaces the previously proposed times.
 */
export function createInterviewInvite(
  positionId: string,
  jobSeekerId: string,
  proposedTimes: string[]
): InterviewSlot {
  const store = readStore();
  const matchId = getMatchId(positionId, jobSeekerId);

  const slot: InterviewSlot = { matchId, proposedTimes, status: "pending" };
  const slotIdx = store.interviewSlots.findIndex((s) => s.matchId === matchId);
  if (slotIdx === -1) {
    store.interviewSlots.push(slot);
  } else {
    store.interviewSlots[slotIdx] = slot;
  }

  const matchIdx = store.matches.findIndex(
    (m) => m.positionId === positionId && m.jobSeekerId === jobSeekerId
  );
  if (matchIdx !== -1) {
    store.matches[matchIdx] = { ...store.matches[matchIdx], status: "contacted" };
  }

  writeStore(store);
  notify();
  return slot;
}

/**
 * Cancels an interview invite: removes the InterviewSlot and reverts the
 * underlying Match back to "pending" — the mirror image of
 * createInterviewInvite, for when HR changes their mind. Works regardless of
 * the slot's current status (pending/confirmed/declined) since HR may want
 * to clear any of those and start over.
 */
export function cancelInterviewInvite(positionId: string, jobSeekerId: string): void {
  const store = readStore();
  const matchId = getMatchId(positionId, jobSeekerId);

  store.interviewSlots = store.interviewSlots.filter((s) => s.matchId !== matchId);

  const matchIdx = store.matches.findIndex(
    (m) => m.positionId === positionId && m.jobSeekerId === jobSeekerId
  );
  if (matchIdx !== -1) {
    store.matches[matchIdx] = { ...store.matches[matchIdx], status: "pending" };
  }

  writeStore(store);
  notify();
}

export type CompanyInterviewSlot = InterviewSlot & {
  positionTitle: string;
  jobSeeker: JobSeeker;
};

export function getInterviewSlotsForCompany(companyId: string): CompanyInterviewSlot[] {
  const store = readStore();
  const positionsById = new Map(
    store.positions.filter((p) => p.companyId === companyId).map((p) => [p.id, p])
  );
  const jobSeekersById = new Map(store.jobSeekers.map((js) => [js.id, js]));

  return store.interviewSlots
    .map((slot) => {
      const [positionId, jobSeekerId] = slot.matchId.split("::");
      const position = positionsById.get(positionId);
      const jobSeeker = jobSeekersById.get(jobSeekerId);
      if (!position || !jobSeeker) return null;
      return { ...slot, positionTitle: position.title, jobSeeker };
    })
    .filter((s): s is CompanyInterviewSlot => s !== null);
}

export const getInterviewSlotsForCompanySnapshot = memoPerVersion(getInterviewSlotsForCompany);

// --- dashboard summary ---

export type DashboardSummary = {
  openPositionsCount: number;
  totalMatchesCount: number;
  standoutCandidates: { jobSeeker: JobSeeker; positionTitle: string; matchScore: number }[];
};

export function getDashboardSummary(companyId: string): DashboardSummary {
  const store = readStore();
  const positions = store.positions.filter((p) => p.companyId === companyId);
  const positionIds = new Set(positions.map((p) => p.id));
  const jobSeekersById = new Map(store.jobSeekers.map((js) => [js.id, js]));
  const companyMatches = store.matches.filter((m) => positionIds.has(m.positionId));

  const standoutCandidates = companyMatches
    .filter((m) => isStandoutScore(m.matchScore))
    .map((m) => {
      const jobSeeker = jobSeekersById.get(m.jobSeekerId);
      const position = store.positions.find((p) => p.id === m.positionId);
      if (!jobSeeker || !position) return null;
      return { jobSeeker, positionTitle: position.title, matchScore: m.matchScore };
    })
    .filter((c): c is { jobSeeker: JobSeeker; positionTitle: string; matchScore: number } => c !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    openPositionsCount: positions.filter((p) => p.open).length,
    totalMatchesCount: companyMatches.length,
    standoutCandidates,
  };
}

export const getDashboardSummarySnapshot = memoPerVersion(getDashboardSummary);

// --- candidate report ---

export type CandidateReport = {
  jobSeeker: JobSeeker;
  /** Real name is withheld (Blind Review) until at least one match with this company is "contacted". */
  nameRevealed: boolean;
  matches: {
    positionId: string;
    positionTitle: string;
    matchScore: number;
    status: MatchStatus;
    /** From the InterviewSlot for this match, if an invite has been sent. */
    proposedTimes?: string[];
  }[];
  isStandout: boolean;
};

/** Returns null if this jobSeeker has no match with any position belonging to companyId — the report-page guard against viewing other companies' candidates. */
export function getCandidateReport(jobSeekerId: string, companyId: string): CandidateReport | null {
  const store = readStore();
  const jobSeeker = store.jobSeekers.find((js) => js.id === jobSeekerId);
  if (!jobSeeker) return null;

  const companyPositionIds = new Set(
    store.positions.filter((p) => p.companyId === companyId).map((p) => p.id)
  );
  const matches = store.matches
    .filter((m) => m.jobSeekerId === jobSeekerId && companyPositionIds.has(m.positionId))
    .map((m) => {
      const position = store.positions.find((p) => p.id === m.positionId);
      const slot = store.interviewSlots.find((s) => s.matchId === getMatchId(m.positionId, m.jobSeekerId));
      return {
        positionId: m.positionId,
        positionTitle: position?.title ?? m.positionId,
        matchScore: m.matchScore,
        status: m.status,
        proposedTimes: slot?.proposedTimes,
      };
    });

  if (matches.length === 0) return null;

  return {
    jobSeeker,
    nameRevealed: matches.some((m) => m.status === "contacted"),
    matches,
    isStandout: matches.some((m) => isStandoutScore(m.matchScore)),
  };
}

export const getCandidateReportSnapshot = memoPerVersion(getCandidateReport);
