export type RadarAxisDatum = { axis: string; value: number };

export type SkillTag = { label: string; bg: string; color: string };

export type JobCategory = "dev" | "marketing" | "design";
export type WorkType = "hybrid" | "remote" | "onsite";
export type JobLevel = "entry" | "mid-senior" | "senior";
export type City = "bangkok" | "upcountry";

export type Job = {
  title: string;
  company: string;
  salary: string;
  /** Free-text override for the full salary display (job board card), e.g. "ตามโครงสร้างบริษัทฯ" for companies that don't disclose a range. When absent, the full range is derived from salaryMin/salaryMax. */
  salaryNote?: string;
  /** Optional extra detail badge some companies add, e.g. "สัมภาษณ์งานออนไลน์". Shown under the salary on the job board card. */
  interviewNote?: string;
  category: JobCategory;
  workType: WorkType;
  city: City;
  salaryMin: number;
  salaryMax: number;
  level: JobLevel;
  hardSkills: string;
  skillTags: SkillTag[];
};

export type AxisChip = {
  en: string;
  th: string;
  value: number;
  color: string;
};

export type FaqItem = { q: string; a: string };

export type Step = { n: string; title: string; desc: string; color: string };

export type GameStage = {
  id: number;
  title: string;
  subtitle: string;
  desc: string;
  iconKey: "risk" | "flexibility" | "focus" | "collaboration";
  color: string;
};

export type Company = {
  id: string;
  name: string;
  industry?: string;
  createdAt: string;
  /** Email domain (e.g. "techcorpglobal.com") used to auto-match new HR signups to an existing company at /company/register. */
  domain: string;
};

export type HRUser = {
  id: string;
  companyId: string;
  name: string;
  email: string;
};

/** Same 0-100 scale as RadarAxisDatum/AxisChip.value — the same 6-axis Smart Profile system shown on /profile (RADAR_DATA/AXIS_CHIPS in data.ts), reused here as the single soft-skill taxonomy for both candidates and position requirements. */
export type PositionSoftSkillRequirements = {
  learningAgility?: number;
  resilienceAdaptability?: number;
  criticalThinking?: number;
  decisionMakingUnderPressure?: number;
  riskTolerance?: number;
  collaborationMindset?: number;
};

/** A job seeker's actual scores on the same 4 dimensions — compared against a Position's requirements to compute a match. */
export type SoftSkillScores = PositionSoftSkillRequirements;

export type Position = {
  id: string;
  companyId: string;
  title: string;
  /** Must be values from onetSkills.hardSkills (src/data/onet_skills_dictionary_full.json) — same dictionary the resume scanner matches against. */
  requiredHardSkills: string[];
  requiredSoftSkills: PositionSoftSkillRequirements;
  /** Closed positions are kept (for match history) but excluded from the open-positions count/list. */
  open: boolean;
};

export type MatchStatus = "pending" | "contacted";

export type Match = {
  positionId: string;
  jobSeekerId: string;
  matchScore: number;
  status: MatchStatus;
};

export type HardSkillStatus = "verified" | "partial" | "unclear";

export type JobSeekerHardSkill = { skill: string; status: HardSkillStatus };

/** Withheld in the UI under the same Blind Review condition as `realName` — see JobSeeker's docstring. */
export type JobSeekerContactInfo = {
  email: string;
  phone: string;
  location: string;
};

/**
 * Candidate profile for the HR-facing match/report views. No JobSeeker
 * account/login system exists yet — these are read-only records the
 * matching function scores Positions against. `realName`, `currentRole`,
 * `yearsOfExperience`, and `contact` are all withheld (Blind Review) until a
 * Match's status is "contacted" — gated in the UI, not stripped from the
 * data itself (same pattern as `realName` already used).
 */
export type JobSeeker = {
  id: string;
  realName: string;
  /** Candidate's current job title/employer, e.g. "Frontend Developer ที่ StartUp Hub" — distinct from the position they're applying to here. */
  currentRole: string;
  yearsOfExperience: number;
  contact: JobSeekerContactInfo;
  /** Same Blind Review gate as realName — only rendered once nameRevealed is true; see the blind-state mascot image used before that. */
  photoUrl: string;
  hardSkills: JobSeekerHardSkill[];
  softSkills: SoftSkillScores;
  aiSummary: string;
};

export type InterviewSlotStatus = "pending" | "confirmed" | "declined";

/**
 * HR-side-only for now: created when HR sends an interview invite with
 * proposed times. The job-seeker-facing accept/decline flow, real
 * notifications, and auto-transition to "confirmed" are backlog — status
 * stays "pending" indefinitely until that's built.
 */
export type InterviewSlot = {
  /** `${positionId}::${jobSeekerId}` — Match has no id of its own (it's keyed by that pair), so this derives one rather than adding a redundant field to Match. */
  matchId: string;
  /** Date-time strings, e.g. "2026-08-25 14:00" — 1 to 3 proposed slots. */
  proposedTimes: string[];
  status: InterviewSlotStatus;
  confirmedTime?: string;
};
