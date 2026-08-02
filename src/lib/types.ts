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
