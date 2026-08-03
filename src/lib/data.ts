import type { AxisChip, FaqItem, GameStage, Job, RadarAxisDatum, Step } from "./types";

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
    title: "เล่นเกมแทนเขียนเรซูเม่",
    desc: "มินิเกมประสาทวิทยาศาสตร์สั่นๆ เพื่อประเมินดึงจุดเด่นและสไตล์การทำงานจริง ไม่ใช่คำตอบท่องจำ",
    color: "#FF6E5C",
  },
  {
    n: "02",
    title: "AI วิเคราะห์ 6 มิติศักยภาพ",
    desc: "แปลงพฤติกรรมการเล่นเป็น Radar Chart และ AI Feedback Report แบบเจาะลึก",
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
    title: "เกม: Crypto/Sneaker Drop",
    subtitle: "BART Test — Risk Tolerance & Decision Making",
    icon: "👟",
    desc: "กด 'ปั๊มราคาราคา/มูลค่า' เพื่อเพิ่มคะแนนความเสี่ยง หากปั๊มมากเกินไป สินค้าจะแตก/หลุดมือ! เลือกจังหวะ Cash Out ที่ดีที่สุด",
    color: "#FF6E5C",
  },
  {
    id: 2,
    title: "เกม: Matcha Bar Barista Rush",
    subtitle: "WCST Test — Learning Agility & Cognitive Flexibility",
    desc: "จับคู่สูตรชาเขียวตามกติกาของร้าน โดยกติกาจะแอบเปลี่ยนกะทันหัน ปรับตัวและเรียนรู้รูปแบบใหม่ให้เร็วที่สุด",
    icon: "🍵",
    color: "#3BF55C",
  },
  {
    id: 3,
    title: "เกม: Doomscroll Shield",
    subtitle: "Flanker Task — Focus & Distractor Filtering",
    desc: "กดทิศทางลูกศรตรงกลางให้ถูกต้อง โดยไม่เสียสมาธิตัวรบกวนขนาบข้าง (Doomscroll distractions)",
    icon: "🛡️",
    color: "#4D7CFF",
  },
  {
    id: 4,
    title: "เกม: E-Sport Squad Quest",
    subtitle: "PGG Game — Collaboration Mindset & Resource Sharing",
    desc: "ตัดสินใจจัดสรรเหรียญลงกองกลางของทีมร่วมกับผู้เล่น AI เพื่อประโยชน์สูงสุดของทีมเวิร์ก",
    icon: "🎮",
    color: "#F5D949",
  },
];

export const FAQ_DATA: FaqItem[] = [
  {
    q: "ต้องมีประสบการณ์หรือเรซูเม่มาก่อนไหม?",
    a: "ไม่จำเป็น ชุดมินิเกมของเราวัดตัวตนและวิธีคิด ไม่ใช่ความรู้เฉพาะทาง ส่วนขั้นตอนถัดไปคุณเลือกได้ว่าจะอัปโหลดเรซูเม่ให้ AI สรุป หรือคุยกับ AI ตรงๆ แบบไม่มีเอกสารก็ได้",
  },
  {
    q: "เล่นเกมและคุยกับ AI ใช้เวลานานแค่ไหน?",
    a: "ชุดมินิเกมทั้งหมดใช้เวลารวมไม่ถึง 10 นาที ต่อด้วยบทสนทนากับ AI Experience Decoder ที่คุณกำหนดความยาวเองได้ ก่อนบันทึกจริงระบบจะให้คุณยืนยัน/แก้ไขทักษะที่สรุปออกมาเสมอ",
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
    a: "ผู้สมัครทุกคนเล่นมินิเกม Neuroscience 4 ด่านเพื่อวัด Soft Skill 6 มิติ แล้วระบบจะจัดอันดับ Match Rate ให้อัตโนมัติตามเกณฑ์ที่คุณตั้งไว้สำหรับแต่ละตำแหน่ง ลดเวลาไล่อ่านเรซูเม่ทีละใบ",
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
