import type {
  AxisChip,
  FaqItem,
  GameStage,
  InterviewSlot,
  Job,
  JobSeeker,
  Match,
  Position,
  RadarAxisDatum,
  SoftSkillScores,
  Step,
} from "./types";

// Single source of truth for the 6-axis soft-skill taxonomy — same axes
// shown on the candidate-facing /profile page (RADAR_DATA/AXIS_CHIPS below),
// reused for company-side Position requirements and JobSeeker scores so
// there's exactly one soft-skill system across the whole app.
export const SOFT_SKILL_AXIS_ORDER: (keyof SoftSkillScores)[] = [
  "learningAgility",
  "resilienceAdaptability",
  "criticalThinking",
  "decisionMakingUnderPressure",
  "riskTolerance",
  "collaborationMindset",
];

export const SOFT_SKILL_AXIS_META: Record<
  keyof SoftSkillScores,
  { en: string; th: string; color: string }
> = {
  learningAgility: { en: "Learning Agility", th: "ความคล่องตัวในการเรียนรู้", color: "#FF6E5C" },
  resilienceAdaptability: { en: "Resilience & Adaptability", th: "ความยืดหยุ่นและปรับตัว", color: "#3BF55C" },
  criticalThinking: { en: "Critical Thinking", th: "การคิดวิเคราะห์", color: "#4D7CFF" },
  decisionMakingUnderPressure: { en: "Decision Making under Pressure", th: "ตัดสินใจภายใต้แรงกดดัน", color: "#F5D949" },
  riskTolerance: { en: "Risk Tolerance", th: "การยอมรับความเสี่ยง", color: "#B14DFF" },
  collaborationMindset: { en: "Collaboration Mindset", th: "การทำงานร่วมกับผู้อื่น", color: "#FF5CA8" },
};

export const RADAR_DATA: RadarAxisDatum[] = [
  { axis: "Learning Agility", value: 78 },
  { axis: "Resilience & Adaptability", value: 70 },
  { axis: "Critical Thinking", value: 84 },
  { axis: "Decision Making under Pressure", value: 66 },
  { axis: "Risk Tolerance", value: 58 },
  { axis: "Collaboration Mindset", value: 88 },
];

export const AXIS_CHIPS: AxisChip[] = [
  { en: "Learning Agility", th: "ความคล่องตัวในการเรียนรู้", value: 78, color: "#FF6E5C" },
  { en: "Resilience & Adaptability", th: "ความยืดหยุ่นและปรับตัว", value: 70, color: "#3BF55C" },
  { en: "Critical Thinking", th: "การคิดวิเคราะห์", value: 84, color: "#4D7CFF" },
  { en: "Decision Making under Pressure", th: "ตัดสินใจภายใต้แรงกดดัน", value: 66, color: "#F5D949" },
  { en: "Risk Tolerance", th: "การยอมรับความเสี่ยง", value: 58, color: "#B14DFF" },
  { en: "Collaboration Mindset", th: "การทำงานร่วมกับผู้อื่น", value: 88, color: "#FF5CA8" },
];

export const STEPS: Step[] = [
  {
    n: "01",
    title: "เล่นเกมประเมินศักยภาพ",
    desc: "ไม่ต้องมีเรซูเม่ก่อนก็เริ่มได้ เล่นมินิเกมเพื่อวัดตัวตนและสไตล์การทำงานจริง จากนั้นระบบช่วยสร้างหรืออัปโหลดเรซูเม่เพื่อยื่นสมัครได้เลย",
    color: "#FF6E5C",
  },
  {
    n: "02",
    title: "น้องตรงปกวิเคราะห์ 6 มิติศักยภาพ",
    desc: "แปลงพฤติกรรมการเล่นเป็น Radar Chart และ Feedback Report แบบเจาะลึก",
    color: "#3BF55C",
  },
  {
    n: "03",
    title: "Match งานที่ใช่ ไม่ใช่แค่ที่ตรงสเปค",
    desc: "ระบบแนะนำตำแหน่งงานจาก Soft Skill ก่อน แล้วค่อยดู Hard Skill ประกอบ",
    color: "#F5D949",
  },
];

export const GAME_STAGES: GameStage[] = [
  {
    id: 1,
    title: "BART — Balloon Analogue Risk Task",
    subtitle: "วัด: Risk Tolerance & Decision Making under Uncertainty",
    iconKey: "risk",
    desc: "ประเมินว่าคุณรับความเสี่ยงได้มากแค่ไหน และตัดสินใจอย่างไรเมื่อมีสิ่งล่อใจที่ยิ่งเสี่ยงยิ่งได้รับรางวัลมาก แต่ผิดพลาดครั้งเดียวก็หมด วัด Risk Tolerance, Impulse Control และ Expected Value Reasoning",
    color: "#FF6E5C",
  },
  {
    id: 2,
    title: "WCST — Wisconsin Card Sorting Test",
    subtitle: "วัด: Learning Agility & Cognitive Flexibility",
    desc: "ประเมินว่าคุณเรียนรู้กฎใหม่และปรับกลยุทธ์ได้เร็วแค่ไหนเมื่อกติกาเปลี่ยนกะทันหันโดยไม่มีคำเตือน วัด Rule Shifting, Feedback-based Learning และ Perseveration (ความดื้อรั้นต่อกฎเดิม)",
    iconKey: "flexibility",
    color: "#3BF55C",
  },
  {
    id: 3,
    title: "Flanker Task — Eriksen Flanker Test",
    subtitle: "วัด: Attentional Focus & Distractor Filtering",
    desc: "ประเมินความสามารถในการโฟกัสและกรองสิ่งรบกวนออกจากงานหลัก วัด Selective Attention, Inhibitory Control และ Reaction Time under Conflict",
    iconKey: "focus",
    color: "#4D7CFF",
  },
  {
    id: 4,
    title: "PGG — Public Goods Game",
    subtitle: "วัด: Collaboration Mindset & Prosocial Behavior",
    desc: "ประเมินว่าคุณตัดสินใจจัดสรรทรัพยากรร่วมกับผู้อื่นอย่างไรเมื่อผลลัพธ์ขึ้นอยู่กับความร่วมมือของทั้งทีม วัด Cooperation Level, Trust และ Social Preference",
    iconKey: "collaboration",
    color: "#F5D949",
  },
];

export const FAQ_DATA: FaqItem[] = [
  {
    q: "ต้องมีเรซูเม่ก่อนสมัครไหม?",
    a: "ไม่จำเป็น คุณเริ่มต้นด้วยมินิเกมและน้องตรงปกได้เลยโดยไม่ต้องมีเรซูเม่ล่วงหน้า หลังประเมินเสร็จระบบจะช่วยสร้างเรซูเม่ให้แบบเร็ว หรืออัปโหลดเรซูเม่ที่มีอยู่แล้วก็ได้ ยิ่งมีเรซูเม่ยิ่งช่วยให้โปรไฟล์สมบูรณ์และ Match Rate แม่นยำขึ้น แต่ไม่มีก็สมัครงานได้",
  },
  {
    q: "เล่นเกมและคุยกับน้องตรงปกใช้เวลานานแค่ไหน?",
    a: "ชุดมินิเกมทั้งหมดใช้เวลารวมไม่ถึง 10 นาที ต่อด้วยบทสนทนากับน้องตรงปกที่คุณกำหนดความยาวเองได้ ก่อนบันทึกจริงระบบจะให้คุณยืนยัน/แก้ไขทักษะที่สรุปออกมาเสมอ",
  },
  {
    q: "ข้อมูลพฤติกรรมจากเกมของเราถูกใช้และเก็บยังไง?",
    a: "ก่อนเริ่มเล่น ระบบจะขอความยินยอมจากคุณอย่างชัดเจนก่อนเสมอ พร้อมอธิบายว่าจะนำข้อมูลไปวิเคราะห์เป็นทักษะ 6 ด้านอย่างไรและใครเห็นได้บ้าง โดยไม่เก็บข้อมูลส่วนเกินที่ไม่จำเป็น",
  },
  {
    q: "บริษัทเห็นข้อมูลอะไรบ้าง และเห็นตอนไหน?",
    a: "ในรอบพิจารณาแรก บริษัทจะเห็นแค่กราฟทักษะ 6 ด้านและทักษะความสามารถของคุณ โดยไม่เห็นชื่อจริงหรือหน้าตา (เพื่อลดอคติ) ข้อมูลติดต่อจริงจะถูกเปิดเผยก็ต่อเมื่อบริษัทกดนัดสัมภาษณ์คุณเท่านั้น",
  },
  {
    q: "ระบบแนะนำงาน/แนะนำผู้สมัครด้วยเหตุผลอะไร เห็นได้ไหม?",
    a: 'เห็นได้เสมอ ทุกคำแนะนำมาพร้อมเหตุผลที่อ่านเข้าใจง่าย เช่น "แนะนำเพราะปรับตัวเรียนรู้ไวกว่าเกณฑ์ และมีทักษะตรงกับตำแหน่งนี้" ไม่ใช่แค่ตัวเลขคะแนนลอยๆ ที่ไม่รู้ที่มา',
  },
  {
    q: "หลังสมัครงานแล้ว ติดตามความคืบหน้ายังไง?",
    a: "มีหน้าติดตามสถานะแบบเรียลไทม์ (สมัครแล้ว → ผ่านด่านแรก → รอสัมภาษณ์ → ได้รับข้อเสนองาน) พร้อมแจ้งเตือนผ่านอีเมล และคุย/นัดสัมภาษณ์กับ HR ได้ในระบบโดยตรง ไม่ต้องออกไปใช้ช่องทางอื่น",
  },
];

export const COMPANY_FAQ_DATA: FaqItem[] = [
  {
    q: "ระบบช่วยคัดกรอง Candidate ยังไงบ้าง?",
    a: "ผู้สมัครเล่นมินิเกมประสาทวิทยาศาสตร์ (Neuroscience Games) เพื่อวัด Soft Skill 6 มิติจากพฤติกรรมจริง จากนั้นระบบจัดอันดับ Match Rate ให้อัตโนมัติตามเกณฑ์ที่คุณตั้งไว้สำหรับแต่ละตำแหน่ง HR เห็นโปรไฟล์ทักษะและเรซูเม่ควบคู่กัน ช่วยลดเวลาคัดกรองเบื้องต้น",
  },
  {
    q: "Blind Review คืออะไร ช่วยลดอคติได้จริงไหม?",
    a: "ในรอบพิจารณาแรก ทีมคุณจะเห็นแค่กราฟทักษะ 6 ด้านและ Hard Skill ของผู้สมัคร โดยไม่เห็นชื่อ รูปภาพ หรือข้อมูลที่อาจนำไปสู่อคติ ข้อมูลติดต่อจะเปิดเผยก็ต่อเมื่อคุณกดนัดสัมภาษณ์เท่านั้น",
  },
  {
    q: "ใช้เวลานานแค่ไหนกว่าจะเห็นผู้สมัครที่ตรงสเปค?",
    a: "หลังประกาศตำแหน่งงาน ระบบจะเริ่มจัดอันดับผู้สมัครที่ Match Rate สูงให้ทันทีที่มีคนเล่นเกมและยื่นใบสมัคร พร้อมเหตุผลประกอบการแนะนำทุกครั้ง ไม่ใช่แค่ตัวเลขคะแนนลอยๆ",
  },
  {
    q: "ต้องมีทีม HR ขนาดใหญ่หรือระบบ ATS เดิมไหม?",
    a: "ไม่จำเป็น แพลตฟอร์มออกแบบให้ทีม HR ขนาดเล็กใช้งานได้ทันทีโดยไม่ต้องเชื่อมต่อระบบเดิม พร้อมหน้าติดตามสถานะผู้สมัครแบบเรียลไทม์ในที่เดียว",
  },
];

export const JOBS: Job[] = [
  {
    title: "Senior Frontend Developer",
    company: "TechCorp Global · Bangkok (Hybrid)",
    salary: "฿65k - ฿95k",
    interviewNote: "สัมภาษณ์งานออนไลน์",
    category: "dev",
    workType: "hybrid",
    city: "bangkok",
    salaryMin: 65000,
    salaryMax: 95000,
    level: "senior",
    hardSkills: "React · TypeScript · Tailwind CSS · REST API",
    skillTags: [
      { label: "Critical Thinking ≥80%", bg: "rgba(77,124,255,0.1)", color: "#4D7CFF" },
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
    ],
  },
  {
    title: "AI Data Scientist & Analyst",
    company: "DataDrive Insights · Bangkok (Remote)",
    salary: "฿55k - ฿85k",
    salaryNote: "ตามโครงสร้างบริษัทฯ",
    category: "dev",
    workType: "remote",
    city: "bangkok",
    salaryMin: 55000,
    salaryMax: 85000,
    level: "mid-senior",
    hardSkills: "Python · SQL · Machine Learning · Data Viz",
    skillTags: [
      { label: "Critical Thinking ≥80%", bg: "rgba(77,124,255,0.1)", color: "#4D7CFF" },
      { label: "Decision Under Pressure ≥65%", bg: "rgba(245,217,73,0.2)", color: "#856700" },
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
    ],
  },
  {
    title: "Growth Marketing Specialist",
    company: "FinTech Dynamics · Bangkok (On-site)",
    salary: "฿45k - ฿70k",
    category: "marketing",
    workType: "onsite",
    city: "bangkok",
    salaryMin: 45000,
    salaryMax: 70000,
    level: "mid-senior",
    hardSkills: "Performance Ads · SEO/SEM · A/B Testing · GA4",
    skillTags: [
      { label: "Risk Tolerance ≥60%", bg: "rgba(177,77,255,0.1)", color: "#B14DFF" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
      { label: "Resilience ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
    ],
  },
  {
    title: "UI/UX Product Designer",
    company: "Creative Lab Studio · Bangkok (Hybrid)",
    salary: "฿50k - ฿75k",
    interviewNote: "สัมภาษณ์งานออนไลน์",
    category: "design",
    workType: "hybrid",
    city: "bangkok",
    salaryMin: 50000,
    salaryMax: 75000,
    level: "mid-senior",
    hardSkills: "Figma · User Research · Design System · Prototyping",
    skillTags: [
      { label: "Resilience & Adaptability ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
    ],
  },
  {
    title: "Backend Engineer (Node.js)",
    company: "CloudNine Systems · Bangkok (Remote)",
    salary: "฿60k - ฿90k",
    category: "dev",
    workType: "remote",
    city: "bangkok",
    salaryMin: 60000,
    salaryMax: 90000,
    level: "senior",
    hardSkills: "Node.js · PostgreSQL · Docker · AWS",
    skillTags: [
      { label: "Critical Thinking ≥80%", bg: "rgba(77,124,255,0.1)", color: "#4D7CFF" },
      { label: "Decision Under Pressure ≥65%", bg: "rgba(245,217,73,0.2)", color: "#856700" },
      { label: "Resilience ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
    ],
  },
  {
    title: "Product Manager",
    company: "Nimbus Labs · Bangkok (Hybrid)",
    salary: "฿70k - ฿100k",
    salaryNote: "ตามโครงสร้างบริษัทฯ",
    category: "dev",
    workType: "hybrid",
    city: "bangkok",
    salaryMin: 70000,
    salaryMax: 100000,
    level: "senior",
    hardSkills: "Roadmapping · Agile · Stakeholder Mgmt · Analytics",
    skillTags: [
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
      { label: "Critical Thinking ≥80%", bg: "rgba(77,124,255,0.1)", color: "#4D7CFF" },
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
    ],
  },
  {
    title: "Content Marketing Lead",
    company: "BrightWave Media · Bangkok (On-site)",
    salary: "฿40k - ฿60k",
    category: "marketing",
    workType: "onsite",
    city: "bangkok",
    salaryMin: 40000,
    salaryMax: 60000,
    level: "mid-senior",
    hardSkills: "Copywriting · SEO · Content Strategy · Social Media",
    skillTags: [
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
      { label: "Risk Tolerance ≥60%", bg: "rgba(177,77,255,0.1)", color: "#B14DFF" },
    ],
  },
  {
    title: "Brand & Performance Marketer",
    company: "FinTech Dynamics · ต่างจังหวัด (On-site)",
    salary: "฿35k - ฿55k",
    category: "marketing",
    workType: "onsite",
    city: "upcountry",
    salaryMin: 35000,
    salaryMax: 55000,
    level: "entry",
    hardSkills: "Meta Ads · TikTok Ads · Branding · Copywriting",
    skillTags: [
      { label: "Risk Tolerance ≥60%", bg: "rgba(177,77,255,0.1)", color: "#B14DFF" },
      { label: "Resilience ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
    ],
  },
  {
    title: "Growth & Community Marketer",
    company: "PlayNext Studio · Work Anywhere (Remote)",
    salary: "฿38k - ฿58k",
    category: "marketing",
    workType: "remote",
    city: "bangkok",
    salaryMin: 38000,
    salaryMax: 58000,
    level: "entry",
    hardSkills: "Community Mgmt · Analytics · Content Calendar · CRM",
    skillTags: [
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
      { label: "Risk Tolerance ≥60%", bg: "rgba(177,77,255,0.1)", color: "#B14DFF" },
    ],
  },
  {
    title: "Junior Product Designer",
    company: "Studio Loom · Bangkok (Hybrid)",
    salary: "฿30k - ฿45k",
    category: "design",
    workType: "hybrid",
    city: "bangkok",
    salaryMin: 30000,
    salaryMax: 45000,
    level: "entry",
    hardSkills: "Figma · Wireframing · Design Handoff · UI Kits",
    skillTags: [
      { label: "Learning Agility ≥75%", bg: "rgba(255,110,92,0.1)", color: "#d63d28" },
      { label: "Resilience & Adaptability ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
    ],
  },
  {
    title: "Design Systems Lead",
    company: "Creative Lab Studio · ต่างจังหวัด (Hybrid)",
    salary: "฿65k - ฿90k",
    salaryNote: "ตามโครงสร้างบริษัทฯ",
    category: "design",
    workType: "hybrid",
    city: "upcountry",
    salaryMin: 65000,
    salaryMax: 90000,
    level: "senior",
    hardSkills: "Design Systems · Figma · Component Libraries · Tokens",
    skillTags: [
      { label: "Critical Thinking ≥80%", bg: "rgba(77,124,255,0.1)", color: "#4D7CFF" },
      { label: "Collaboration ≥85%", bg: "rgba(255,92,168,0.1)", color: "#c22d76" },
      { label: "Resilience & Adaptability ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
    ],
  },
  {
    title: "QA Automation Engineer",
    company: "TechCorp Global · Bangkok (Hybrid)",
    salary: "฿48k - ฿68k",
    category: "dev",
    workType: "hybrid",
    city: "bangkok",
    salaryMin: 48000,
    salaryMax: 68000,
    level: "mid-senior",
    hardSkills: "Selenium · Playwright · CI/CD · Test Strategy",
    skillTags: [
      { label: "Critical Thinking ≥80%", bg: "rgba(77,124,255,0.1)", color: "#4D7CFF" },
      { label: "Resilience ≥70%", bg: "rgba(59,245,92,0.2)", color: "#0f5c22" },
      { label: "Decision Under Pressure ≥65%", bg: "rgba(245,217,73,0.2)", color: "#856700" },
    ],
  },
];

export const WORK_TYPE_LABELS: Record<string, string> = {
  hybrid: "Hybrid (สลับเข้าออฟฟิศ)",
  remote: "Remote (ทำจากที่ไหนก็ได้)",
  onsite: "On-site (ทำงานที่ออฟฟิศ)",
};

export const LOCATION_LABELS: Record<string, string> = {
  bangkok: "กรุงเทพฯ และปริมณฑล",
  upcountry: "ต่างจังหวัด",
  anywhere: "Work Anywhere",
};

export const LEVEL_LABELS: Record<string, string> = {
  entry: "Entry Level / จบใหม่",
  "mid-senior": "Mid-Senior Level",
  senior: "Senior / Lead",
};

export const BIZ_LABELS: Record<string, string> = {
  dev: "Software & Data",
  marketing: "Marketing",
  design: "Design",
};

export const CATEGORY_TABS: { key: "all" | "dev" | "marketing" | "design"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "dev", label: "Software & Data" },
  { key: "marketing", label: "Marketing" },
  { key: "design", label: "Design" },
];

// requiredHardSkills values are drawn from onetSkills.hardSkills
// (src/data/onet_skills_dictionary_full.json) — verified present in that
// dictionary, same source the resume scanner (src/lib/pdf.ts +
// src/lib/ahoCorasick.ts) matches against.
export const MOCK_POSITIONS: Position[] = [
  {
    id: "pos_001",
    companyId: "co_techcorp",
    title: "Senior Frontend Developer",
    requiredHardSkills: ["React", "TypeScript", "Git"],
    // Thresholds mirror this same title's skillTags in the JOBS array above.
    requiredSoftSkills: { criticalThinking: 80, learningAgility: 75, collaborationMindset: 85 },
    open: true,
  },
  {
    id: "pos_002",
    companyId: "co_techcorp",
    title: "QA Automation Engineer",
    requiredHardSkills: ["Docker", "Linux", "Git"],
    requiredSoftSkills: { criticalThinking: 80, resilienceAdaptability: 70, decisionMakingUnderPressure: 65 },
    open: true,
  },
  {
    id: "pos_003",
    companyId: "co_datadrive",
    title: "AI Data Scientist & Analyst",
    requiredHardSkills: ["Python", "PostgreSQL", "Tableau"],
    requiredSoftSkills: { criticalThinking: 80, decisionMakingUnderPressure: 65, learningAgility: 75 },
    open: true,
  },
  {
    id: "pos_004",
    companyId: "co_fintech",
    title: "Growth Marketing Specialist",
    requiredHardSkills: ["Google Ads", "Google Analytics", "TikTok"],
    requiredSoftSkills: { riskTolerance: 60, collaborationMindset: 85, resilienceAdaptability: 70 },
    open: true,
  },
  {
    id: "pos_005",
    companyId: "co_creativelab",
    title: "UI/UX Product Designer",
    requiredHardSkills: ["Figma", "Adobe Illustrator"],
    requiredSoftSkills: { resilienceAdaptability: 70, learningAgility: 75, collaborationMindset: 85 },
    open: true,
  },
];

// Every match below that has a corresponding entry in MOCK_INTERVIEW_SLOTS
// is marked "contacted" — sending an interview invite is what lifts Blind
// Review (see getCandidateReport's nameRevealed), so a match can't have an
// interview slot while still "pending" without that invariant going stale.
export const MOCK_MATCHES: Match[] = [
  { positionId: "pos_001", jobSeekerId: "js_a12f", matchScore: 92, status: "contacted" },
  { positionId: "pos_001", jobSeekerId: "js_b7k9", matchScore: 84, status: "contacted" },
  { positionId: "pos_001", jobSeekerId: "js_c3mx", matchScore: 71, status: "contacted" },
  { positionId: "pos_001", jobSeekerId: "js_g4wp", matchScore: 86, status: "contacted" },
  { positionId: "pos_001", jobSeekerId: "js_h9lk", matchScore: 93, status: "contacted" },
  { positionId: "pos_002", jobSeekerId: "js_i2bn", matchScore: 77, status: "contacted" },
  { positionId: "pos_002", jobSeekerId: "js_j6ty", matchScore: 68, status: "contacted" },
  { positionId: "pos_002", jobSeekerId: "js_k7mp", matchScore: 82, status: "contacted" },
  { positionId: "pos_003", jobSeekerId: "js_d8qz", matchScore: 88, status: "contacted" },
  { positionId: "pos_004", jobSeekerId: "js_e2rv", matchScore: 79, status: "contacted" },
  { positionId: "pos_005", jobSeekerId: "js_f5nt", matchScore: 90, status: "contacted" },
];

// realName, currentRole, yearsOfExperience, and contact are all withheld in
// the UI (Blind Review) until the candidate's match status is "contacted" —
// see companyStore.ts's getCandidateReport.
export const MOCK_JOB_SEEKERS: JobSeeker[] = [
  {
    id: "js_a12f",
    realName: "ณิชา วัฒนกุล",
    currentRole: "Frontend Developer ที่ StartUp Hub",
    yearsOfExperience: 4,
    contact: { email: "nicha.watt@example.com", phone: "081-234-5678", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_a12f.jpg",
    hardSkills: [
      { skill: "React", status: "verified" },
      { skill: "TypeScript", status: "verified" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 82, resilienceAdaptability: 75, criticalThinking: 88, decisionMakingUnderPressure: 70, riskTolerance: 60, collaborationMindset: 85 },
    aiSummary: "จากเรซูเม่และผลการประเมินศักยภาพของน้องตรงปก ผู้สมัครมีทักษะด้านเทคนิคที่ยืนยันแล้วครบทั้ง React, TypeScript และ Git ซึ่งสอดคล้องกับประสบการณ์การทำงานที่ระบุไว้ในเรซูเม่ ประกอบกับผลประเมิน 6 มิติที่โดดเด่นเป็นพิเศษด้าน Critical Thinking (88%) และ Collaboration Mindset (85%) ที่สูงกว่าเกณฑ์ของตำแหน่งนี้อย่างชัดเจน รวมถึง Learning Agility (82%) ที่สะท้อนความสามารถในการเรียนรู้เทคโนโลยีใหม่ได้อย่างรวดเร็ว แม้ Risk Tolerance (60%) จะอยู่ในระดับปานกลางซึ่งเป็นเรื่องปกติสำหรับสายงานที่เน้นความแม่นยำมากกว่าความเสี่ยง ภาพรวมจึงเป็นผู้สมัครที่มีทั้งฝีมือเชิงเทคนิคและศักยภาพเชิงพฤติกรรมที่เหมาะสมอย่างยิ่งกับตำแหน่ง Senior Frontend Developer ที่ต้องตัดสินใจเชิงเทคนิคด้วยตนเองและทำงานร่วมกับทีมได้อย่างราบรื่น",
  },
  {
    id: "js_b7k9",
    realName: "ภูวดล เจริญพร",
    currentRole: "Frontend Developer ที่ Freelance",
    yearsOfExperience: 2,
    contact: { email: "phuwadol.j@example.com", phone: "082-345-6789", location: "นนทบุรี" },
    photoUrl: "/avatars/js_b7k9.jpg",
    hardSkills: [
      { skill: "React", status: "verified" },
      { skill: "TypeScript", status: "partial" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 68, resilienceAdaptability: 62, criticalThinking: 72, decisionMakingUnderPressure: 58, riskTolerance: 55, collaborationMindset: 66 },
    aiSummary: "จากเรซูเม่และผลการประเมินศักยภาพ ผู้สมัครมีทักษะ React และ Git ที่ยืนยันแล้วจากทั้งเรซูเม่และบทสนทนา แต่ TypeScript ยังพบหลักฐานเพียงบางส่วนเท่านั้น ยังไม่สามารถยืนยันความเชี่ยวชาญได้เต็มที่ ด้านผลประเมิน 6 มิติอยู่ในระดับปานกลางทุกด้าน โดย Critical Thinking (72%) และ Collaboration Mindset (66%) เป็นจุดที่ค่อนข้างดีที่สุด ขณะที่ Decision Making under Pressure (58%) และ Risk Tolerance (55%) ยังต่ำกว่าเกณฑ์ของตำแหน่งนี้อยู่พอสมควร ภาพรวมจึงเป็นผู้สมัครที่มีพื้นฐานดีแต่ยังไม่ครบทุกด้าน ควรสอบถามเชิงลึกเรื่อง TypeScript และทดสอบการตัดสินใจภายใต้ความกดดันเพิ่มเติมในรอบสัมภาษณ์ก่อนตัดสินใจ",
  },
  {
    id: "js_c3mx",
    realName: "กัญญาณัฐ สุขใจ",
    currentRole: "จบใหม่ / เคยฝึกงานสาย Frontend",
    yearsOfExperience: 0,
    contact: { email: "kanyanat.s@example.com", phone: "083-456-7890", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_c3mx.jpg",
    hardSkills: [
      { skill: "React", status: "partial" },
      { skill: "TypeScript", status: "unclear" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 58, resilienceAdaptability: 55, criticalThinking: 56, decisionMakingUnderPressure: 50, riskTolerance: 52, collaborationMindset: 60 },
    aiSummary: "จากเรซูเม่และผลการประเมินศักยภาพ มีเพียง Git ที่ยืนยันได้ชัดเจน ส่วน React พบหลักฐานเพียงบางส่วนและ TypeScript ยังไม่สามารถยืนยันได้จากทั้งเรซูเม่และบทสนทนา ด้านผลประเมิน 6 มิติอยู่ในระดับกลางค่อนไปทางต่ำแทบทุกด้าน (50-60%) โดยไม่มีจุดใดโดดเด่นเป็นพิเศษ ทั้ง Critical Thinking (56%) และ Decision Making under Pressure (50%) ยังห่างจากเกณฑ์ของตำแหน่งระดับ Senior อยู่พอสมควร ภาพรวมจึงเหมาะกับตำแหน่งระดับ Junior ที่มีพี่เลี้ยงคอยซัพพอร์ตและมีเวลาพัฒนาทักษะเพิ่มเติม มากกว่าบทบาทที่ต้องตัดสินใจเชิงเทคนิคด้วยตนเอง",
  },
  {
    id: "js_d8qz",
    realName: "ธีรภัทร มั่นคง",
    currentRole: "Data Analyst ที่ FinServe Co.",
    yearsOfExperience: 3,
    contact: { email: "theerapat.m@example.com", phone: "084-567-8901", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_d8qz.jpg",
    hardSkills: [
      { skill: "Python", status: "verified" },
      { skill: "PostgreSQL", status: "verified" },
      { skill: "Tableau", status: "partial" },
    ],
    softSkills: { learningAgility: 80, resilienceAdaptability: 68, criticalThinking: 85, decisionMakingUnderPressure: 72, riskTolerance: 58, collaborationMindset: 65 },
    aiSummary: "จากเรซูเม่และผลการประเมินศักยภาพ ผู้สมัครมีทักษะ Python และ PostgreSQL ที่ยืนยันแล้วอย่างแข็งแรงจากทั้งเรซูเม่และบทสนทนา ส่วน Tableau ยังพบหลักฐานไม่ครบถ้วนนัก ด้านผลประเมิน 6 มิติโดดเด่นชัดเจนที่ Critical Thinking (85%) และ Learning Agility (80%) ซึ่งสูงกว่าเกณฑ์ของตำแหน่งนี้ รวมถึง Decision Making under Pressure (72%) ที่อยู่ในระดับดี สอดคล้องกับงานวิเคราะห์ข้อมูลที่ต้องปรับมุมมอง ประมวลผลข้อมูลจำนวนมาก และตัดสินใจภายใต้ deadline ที่กดดันอยู่เสมอ ภาพรวมจึงเป็นผู้สมัครที่มีทั้งทักษะเทคนิคเชิงลึกและศักยภาพเชิงพฤติกรรมที่เหมาะสมอย่างยิ่งกับตำแหน่ง AI Data Scientist & Analyst",
  },
  {
    id: "js_e2rv",
    realName: "ปวริศา แสงทอง",
    currentRole: "Performance Marketing Executive ที่ AdReach Agency",
    yearsOfExperience: 3,
    contact: { email: "pawarisa.s@example.com", phone: "085-678-9012", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_e2rv.jpg",
    hardSkills: [
      { skill: "Google Ads", status: "verified" },
      { skill: "Google Analytics", status: "partial" },
      { skill: "TikTok", status: "verified" },
    ],
    softSkills: { learningAgility: 65, resilienceAdaptability: 74, criticalThinking: 62, decisionMakingUnderPressure: 60, riskTolerance: 68, collaborationMindset: 72 },
    aiSummary: "จากเรซูเม่และผลการประเมินศักยภาพ ผู้สมัครมีทักษะ Google Ads และ TikTok ที่ยืนยันแล้วจากประสบการณ์ยิงแอดจริงตามที่ระบุในเรซูเม่ ส่วน Google Analytics พบหลักฐานเพียงบางส่วน ด้านผลประเมิน 6 มิติค่อนข้างสมดุล โดย Resilience & Adaptability (74%) และ Collaboration Mindset (72%) อยู่ในระดับดี ประกอบกับ Risk Tolerance (68%) ที่สูงกว่าค่าเฉลี่ย สะท้อนว่ากล้าทดลองแคมเปญใหม่และปรับตัวเมื่อผลลัพธ์ไม่เป็นไปตามแผน ขณะที่ Critical Thinking (62%) ยังเป็นจุดที่พัฒนาต่อได้ ภาพรวมเหมาะกับตำแหน่งการตลาดที่ต้องทดลองและปรับกลยุทธ์อย่างต่อเนื่อง",
  },
  {
    id: "js_f5nt",
    realName: "อภิสิทธิ์ รุ่งเรือง",
    currentRole: "Product Designer ที่ Studio Nine",
    yearsOfExperience: 5,
    contact: { email: "apisit.r@example.com", phone: "086-789-0123", location: "เชียงใหม่" },
    photoUrl: "/avatars/js_f5nt.jpg",
    hardSkills: [
      { skill: "Figma", status: "verified" },
      { skill: "Adobe Illustrator", status: "verified" },
    ],
    softSkills: { learningAgility: 78, resilienceAdaptability: 80, criticalThinking: 70, decisionMakingUnderPressure: 62, riskTolerance: 58, collaborationMindset: 90 },
    aiSummary: "จากเรซูเม่และผลการประเมินศักยภาพ ผู้สมัครมีทักษะ Figma และ Adobe Illustrator ที่ยืนยันแล้วครบทั้งสองรายการจากทั้งเรซูเม่และบทสนทนา ด้านผลประเมิน 6 มิติโดดเด่นเป็นพิเศษที่ Collaboration Mindset สูงถึง 90% รวมถึง Resilience & Adaptability (80%) และ Learning Agility (78%) ที่สูงกว่าเกณฑ์ของตำแหน่งนี้อย่างชัดเจน สะท้อนว่าเป็นนักออกแบบที่ทั้งมีฝีมือและทำงานร่วมกับทีม/ผู้มีส่วนได้ส่วนเสียได้อย่างราบรื่นเป็นพิเศษ พร้อมปรับตัวไวเมื่อโจทย์งานหรือ feedback เปลี่ยนแปลงกะทันหัน ภาพรวมจึงเหมาะสมอย่างยิ่งกับตำแหน่ง UI/UX Product Designer ที่ต้องทำงานร่วมกับหลายฝ่ายอย่างต่อเนื่อง",
  },
  // --- Below: bulk-added for interview-list volume testing (see
  // MOCK_INTERVIEW_SLOTS) — same shape/rigor as the personas above, just
  // shorter aiSummary text since these exist for UI/list-density testing
  // rather than to be individually showcased.
  {
    id: "js_g4wp",
    realName: "ศุภกร ธนวัฒน์",
    currentRole: "Frontend Developer ที่ PixelWorks",
    yearsOfExperience: 3,
    contact: { email: "supakorn.t@example.com", phone: "087-111-2233", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_g4wp.jpg",
    hardSkills: [
      { skill: "React", status: "verified" },
      { skill: "TypeScript", status: "verified" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 76, resilienceAdaptability: 71, criticalThinking: 80, decisionMakingUnderPressure: 68, riskTolerance: 60, collaborationMindset: 82 },
    aiSummary: "ทักษะ React, TypeScript และ Git ยืนยันแล้วครบจากเรซูเม่และบทสนทนา ผลประเมิน 6 มิติโดดเด่นด้าน Critical Thinking (80%) และ Collaboration Mindset (82%) เหมาะกับตำแหน่ง Senior Frontend Developer ที่ต้องทำงานร่วมกับทีมอย่างต่อเนื่อง",
  },
  {
    id: "js_h9lk",
    realName: "พิมพ์ชนก อินทรวิเชียร",
    currentRole: "Senior Frontend Engineer ที่ CloudNest",
    yearsOfExperience: 6,
    contact: { email: "pimchanok.i@example.com", phone: "088-222-3344", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_h9lk.jpg",
    hardSkills: [
      { skill: "React", status: "verified" },
      { skill: "TypeScript", status: "verified" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 88, resilienceAdaptability: 84, criticalThinking: 90, decisionMakingUnderPressure: 82, riskTolerance: 65, collaborationMindset: 87 },
    aiSummary: "ทักษะเทคนิคยืนยันแล้วครบทุกด้าน ผลประเมิน 6 มิติสูงเกินเกณฑ์เกือบทุกแกน โดยเฉพาะ Critical Thinking (90%) และ Learning Agility (88%) — ผู้สมัครระดับ Senior ที่ตัดสินใจเชิงเทคนิคได้ด้วยตนเองและปรับตัวไวภายใต้ deadline",
  },
  {
    id: "js_i2bn",
    realName: "ธีรเดช ศรีวิไล",
    currentRole: "QA Engineer ที่ ShipFast Logistics",
    yearsOfExperience: 2,
    contact: { email: "theeradech.s@example.com", phone: "089-333-4455", location: "นนทบุรี" },
    photoUrl: "/avatars/js_i2bn.jpg",
    hardSkills: [
      { skill: "Docker", status: "verified" },
      { skill: "Linux", status: "partial" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 70, resilienceAdaptability: 66, criticalThinking: 75, decisionMakingUnderPressure: 63, riskTolerance: 55, collaborationMindset: 68 },
    aiSummary: "ทักษะ Docker และ Git ยืนยันแล้ว ส่วน Linux พบหลักฐานบางส่วน ผลประเมินอยู่ในระดับดีด้าน Critical Thinking (75%) เหมาะกับตำแหน่ง QA Automation Engineer ระดับกลาง",
  },
  {
    id: "js_j6ty",
    realName: "กรวิชญ์ บุญมาก",
    currentRole: "จบใหม่ / เคยฝึกงานสาย QA",
    yearsOfExperience: 0,
    contact: { email: "korawit.b@example.com", phone: "090-444-5566", location: "ปทุมธานี" },
    photoUrl: "/avatars/js_j6ty.jpg",
    hardSkills: [
      { skill: "Git", status: "verified" },
      { skill: "Linux", status: "unclear" },
      { skill: "Docker", status: "partial" },
    ],
    softSkills: { learningAgility: 62, resilienceAdaptability: 58, criticalThinking: 55, decisionMakingUnderPressure: 52, riskTolerance: 50, collaborationMindset: 64 },
    aiSummary: "มีเพียง Git ที่ยืนยันได้ชัดเจน Linux และ Docker ยังพบหลักฐานไม่ครบ ผลประเมิน 6 มิติอยู่ระดับกลางค่อนต่ำ เหมาะกับตำแหน่งระดับ Junior ที่มีพี่เลี้ยงคอยซัพพอร์ต",
  },
  {
    id: "js_k7mp",
    realName: "วรรณิศา ประเสริฐกุล",
    currentRole: "QA Automation Engineer ที่ Nimbus Cloud",
    yearsOfExperience: 4,
    contact: { email: "wannisa.p@example.com", phone: "091-555-6677", location: "กรุงเทพฯ" },
    photoUrl: "/avatars/js_k7mp.jpg",
    hardSkills: [
      { skill: "Docker", status: "verified" },
      { skill: "Linux", status: "verified" },
      { skill: "Git", status: "verified" },
    ],
    softSkills: { learningAgility: 74, resilienceAdaptability: 72, criticalThinking: 78, decisionMakingUnderPressure: 70, riskTolerance: 58, collaborationMindset: 75 },
    aiSummary: "ทักษะ Docker, Linux และ Git ยืนยันแล้วครบทั้งสามด้าน ผลประเมิน 6 มิติสม่ำเสมออยู่ในเกณฑ์ดีทุกแกน โดยเฉพาะ Critical Thinking (78%) เหมาะกับตำแหน่ง QA Automation Engineer ระดับกลางถึงอาวุโส",
  },
];

// Seeded interview invites for testing the "นัดสัมภาษณ์ทั้งหมด" list — spans
// all 4 mock companies, though co_techcorp gets the most (8) since it's the
// primary demo login (hr_001/hr_002). Every status (pending/confirmed/
// declined) appears at least once for EACH of co_techcorp's two positions
// (pos_001 and pos_002) individually, not just once overall, so switching
// positions while testing still shows full status coverage. Every matchId
// here must have a corresponding "contacted" entry in MOCK_MATCHES (see the
// note above that array).
export const MOCK_INTERVIEW_SLOTS: InterviewSlot[] = [
  {
    matchId: "pos_001::js_a12f",
    proposedTimes: ["2026-08-25 14:00", "2026-08-26 10:00"],
    status: "confirmed",
    confirmedTime: "2026-08-25 14:00",
  },
  {
    matchId: "pos_001::js_b7k9",
    proposedTimes: ["2026-08-27 11:00", "2026-08-28 15:00"],
    status: "pending",
  },
  {
    matchId: "pos_001::js_c3mx",
    proposedTimes: ["2026-08-24 09:00"],
    status: "declined",
  },
  {
    matchId: "pos_001::js_g4wp",
    proposedTimes: ["2026-08-29 13:00", "2026-08-30 10:00", "2026-08-31 16:00"],
    status: "pending",
  },
  {
    matchId: "pos_001::js_h9lk",
    proposedTimes: ["2026-09-01 11:00"],
    status: "confirmed",
    confirmedTime: "2026-09-01 11:00",
  },
  {
    matchId: "pos_002::js_i2bn",
    proposedTimes: ["2026-08-26 09:30", "2026-08-27 14:30"],
    status: "pending",
  },
  {
    matchId: "pos_002::js_j6ty",
    proposedTimes: ["2026-08-25 10:00"],
    status: "declined",
  },
  {
    matchId: "pos_002::js_k7mp",
    proposedTimes: ["2026-08-24 14:00", "2026-08-25 09:00"],
    status: "confirmed",
    confirmedTime: "2026-08-24 14:00",
  },
  {
    matchId: "pos_003::js_d8qz",
    proposedTimes: ["2026-08-28 13:00"],
    status: "confirmed",
    confirmedTime: "2026-08-28 13:00",
  },
  {
    matchId: "pos_004::js_e2rv",
    proposedTimes: ["2026-08-26 15:00", "2026-08-27 09:00"],
    status: "pending",
  },
  {
    matchId: "pos_005::js_f5nt",
    proposedTimes: ["2026-09-02 10:00", "2026-09-03 14:00"],
    status: "pending",
  },
];
