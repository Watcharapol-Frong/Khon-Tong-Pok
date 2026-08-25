import { FileQuestion, ScanSearch } from "lucide-react";

// Two-sided pain, one per audience — this section exists specifically to
// set up why both a jobseeker AND an HR visitor should keep reading past
// the Hero, before Solution answers it and Platform Overview explains how.
const PROBLEMS = [
  {
    icon: FileQuestion,
    audience: "สำหรับผู้หางาน",
    title: "เรซูเม่บอกได้แค่ประวัติ ไม่บอกว่าคุณทำงานจริงเป็นยังไง",
    desc: "ทักษะการทำงานจริง ความยืดหยุ่น การตัดสินใจภายใต้แรงกดดัน — สิ่งเหล่านี้ไม่มีทางแสดงออกมาในกระดาษแผ่นเดียว ทำให้คนที่มีศักยภาพจริงพลาดโอกาสไปอย่างน่าเสียดาย",
  },
  {
    icon: ScanSearch,
    audience: "สำหรับ HR / องค์กร",
    title: "คัดเรซูเม่เป็นร้อยใบ แต่ยังเดา Soft Skill ไม่ออกจนกว่าจะจ้างเข้ามาจริง",
    desc: "Keyword ในเรซูเม่กรองได้แค่ Hard Skill ส่วน Soft Skill ที่ตัดสินว่าคนคนนี้จะเข้ากับทีมและงานได้จริงไหม ต้องรอจนจ้างมาแล้วถึงจะรู้ — ความเสี่ยง mismatch จึงสูงมาก",
  },
];

export function Problem() {
  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
      <div className="mb-8 max-w-[640px]">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          ปัญหาที่เราเห็น
        </div>
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          การจ้างงานแบบเดิม พลาดคนที่ใช่ไปเยอะแค่ไหน?
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        {PROBLEMS.map((p) => (
          <div key={p.audience} className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <p.icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={1.75} />
            </div>
            <div className="mb-2 text-xs font-bold text-[#8A8A8A] uppercase">{p.audience}</div>
            <div className="mb-2 text-base font-extrabold tracking-[-0.01em]">{p.title}</div>
            <div className="text-sm leading-[1.7] text-[#5C5C5C]">{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
