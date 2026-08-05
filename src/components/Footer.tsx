"use client";

import { useBreakpoint } from "@/hooks/useBreakpoint";

const FOOTER_COLUMNS = [
  { title: "สำหรับผู้สมัคร", links: ["หางาน", "เล่นเกมประเมิน", "โปรไฟล์ของฉัน"] },
  { title: "สำหรับองค์กร", links: ["หา Candidate", "ราคา", "ติดต่อฝ่ายขาย"] },
  { title: "บริษัท", links: ["เกี่ยวกับเรา", "ความเป็นส่วนตัว", "ข้อกำหนดการใช้งาน"] },
];

export function Footer() {
  const { isMobile } = useBreakpoint();

  return (
    <div className="mt-3 bg-[#0F0F0F] px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,64px)] pb-7 text-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-10 border-b border-[rgba(255,255,255,0.1)] pb-9">
        <div className="min-w-[220px] flex-[1_1_260px]">
          <div className="mb-3.5 flex items-center gap-2.5">
            <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-white" />
            <div className="text-lg font-extrabold tracking-[-0.02em]">คนตรงปก <span className="text-xs font-normal opacity-70">(KhonTongPok)</span></div>
          </div>
          <div className="max-w-[280px] text-[13px] leading-[1.7] text-[#9A9A9A]">
            พิสูจน์ศักยภาพจริง ด้วยตัวตนและทักษะ <br />
            ประเมินศักยภาพก่อน ระบบช่วยสร้างเรซูเม่ได้เลย
          </div>
        </div>
        <div
          className="grid min-w-0 flex-[1_1_auto] gap-[clamp(20px,4vw,56px)]"
          style={{ gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,auto)" }}
        >
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="mb-3.5 text-xs font-bold tracking-[0.04em] text-[#9A9A9A] uppercase">
                {col.title}
              </div>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <span key={link} className="cursor-pointer text-sm text-[#E5E5E5]">
                    {link}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-3 pt-5">
        <div className="text-[13px] text-[#8A8A8A]">© 2026 คนตรงปก (KhonTongPok) · พิสูจน์ศักยภาพจริง ด้วยตัวตนและทักษะ</div>
      </div>
      <div className="mx-auto mt-4 flex max-w-[1240px] items-center justify-center">
        <div className="rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-4 py-1.5 text-center text-[11px] text-[#666666]">
          🚧 Prototype Only — ข้อมูล ตัวเลข และเนื้อหาทั้งหมดในเว็บไซต์นี้เป็น Mockup เพื่อการนำเสนอเท่านั้น ไม่ใช่บริการจริง
        </div>
      </div>
    </div>
  );
}
