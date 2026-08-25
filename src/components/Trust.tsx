import { EyeOff, FlaskConical, ShieldCheck } from "lucide-react";

// Reuses established messaging already proven elsewhere on the site (Blind
// Review from COMPANY_FAQ_DATA, data-consent wording from FAQ_DATA, the
// "research-backed games" line already used on /game) rather than
// inventing new trust claims.
const TRUST_POINTS = [
  {
    icon: FlaskConical,
    title: "งานวิจัยรองรับ",
    desc: "เกมพัฒนาจากแบบทดสอบทางจิตวิทยาและประสาทวิทยาศาสตร์ที่ใช้จริงในงานวิจัย ไม่ใช่แบบทดสอบที่คิดขึ้นเอง",
  },
  {
    icon: EyeOff,
    title: "Blind Review ลดอคติ",
    desc: "รอบพิจารณาแรกเห็นแค่ทักษะและผลประเมิน ไม่เห็นชื่อหรือหน้าตา ลดอคติในการคัดกรองตั้งแต่ต้นทาง",
  },
  {
    icon: ShieldCheck,
    title: "ข้อมูลปลอดภัย ยินยอมก่อนเสมอ",
    desc: "ขอความยินยอมอย่างชัดเจนก่อนเริ่มเล่นทุกครั้ง พร้อมอธิบายว่านำข้อมูลไปใช้ยังไง ไม่เก็บข้อมูลเกินความจำเป็น",
  },
];

export function Trust() {
  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
        {TRUST_POINTS.map((t) => (
          <div key={t.title} className="flex flex-col items-start">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAFAFA]">
              <t.icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={1.75} />
            </div>
            <div className="mb-2 text-base font-extrabold tracking-[-0.01em]">{t.title}</div>
            <div className="text-sm leading-[1.7] text-[#5C5C5C]">{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
