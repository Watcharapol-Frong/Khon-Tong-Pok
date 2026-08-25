import { Brain, Sparkles, Target } from "lucide-react";

// Same dark-panel + monochrome white-card composition used by StrategyPanel
// elsewhere on the site (see prefers_monochrome_spacious memory) — one card
// per platform pillar instead of one per soft-skill axis.
const PILLARS = [
  {
    icon: Brain,
    title: "Neuroscience Assessment",
    desc: "มินิเกมที่พัฒนาจากแบบทดสอบทางจิตวิทยาและประสาทวิทยาศาสตร์ที่ใช้จริงในงานวิจัย วัดพฤติกรรมจริงระหว่างเล่น ไม่ใช่คำตอบที่เตรียมมาตอบ",
  },
  {
    icon: Sparkles,
    title: "AI Profile",
    desc: "น้องตรงปกวิเคราะห์พฤติกรรมการเล่นเป็น Smart Profile 6 มิติ พร้อม Feedback Report ที่อ่านเข้าใจง่าย ไม่ใช่แค่ตัวเลขคะแนนลอยๆ",
  },
  {
    icon: Target,
    title: "Smart Matching",
    desc: "จับคู่ Soft Skill ก่อน แล้วค่อยดู Hard Skill ประกอบ พร้อมเหตุผลของทุกคำแนะนำที่อ่านเข้าใจได้ ไม่ใช่กรองแค่คำในเรซูเม่",
  },
];

export function PlatformOverview() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(40px,6vw,64px)]">
      <div className="rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,52px)] text-white">
        <div className="mb-[18px] inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#9A9A9A] uppercase">
          Platform Overview
        </div>
        <h2 className="mb-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          สามส่วนที่ทำให้คนตรงปกต่างจากแพลตฟอร์มหางานทั่วไป
        </h2>
        <p className="mb-[30px] max-w-[640px] text-sm leading-[1.7] text-[#B5B5B5]">
          แต่ละส่วนทำงานต่อเนื่องกัน ตั้งแต่วัดผลจนถึงจับคู่ ไม่ใช่ฟีเจอร์แยกส่วนที่ไม่เกี่ยวข้องกัน
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="min-w-0 rounded-2xl bg-white p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F5]">
                <p.icon className="h-4 w-4 text-[#0F0F0F]" strokeWidth={2} />
              </div>
              <div className="text-sm font-bold text-[#0F0F0F]">{p.title}</div>
              <div className="mt-1.5 text-xs leading-[1.6] text-[#5C5C5C]">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
