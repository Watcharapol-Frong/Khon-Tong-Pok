"use client";

import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AXIS_CHIPS } from "@/lib/data";

export function StrategyPanel() {
  const { isMobile, isTablet } = useBreakpoint();
  const axisGridCols = isMobile ? "repeat(1,1fr)" : isTablet ? "repeat(2,1fr)" : "repeat(3,1fr)";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(64px,8vw,100px)]">
      <div className="rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,52px)] text-white">
        <div className="mb-[18px] inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#9A9A9A] uppercase">
          กลยุทธ์หลัก
        </div>
        <h2 className="mb-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          Soft Skill Lead, Hard Skill Follow
        </h2>
        <p className="mb-[30px] max-w-[640px] text-sm leading-[1.7] text-[#B5B5B5]">
          ไม่ต้องมีเรซูเม่ก่อนก็เริ่มสมัครได้ หลังประเมินเสร็จระบบช่วยสร้างเรซูเม่ให้แบบเร็ว
          ยิ่งมีเรซูเม่ยิ่งช่วยให้ HR เห็นภาพรวมที่ครบถ้วนและ Match Rate แม่นยำขึ้น
        </p>
        <div
          className="grid gap-px overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.12)]"
          style={{ gridTemplateColumns: axisGridCols }}
        >
          {AXIS_CHIPS.map((a) => (
            <div key={a.en} className="min-w-0 bg-[#0F0F0F] p-[18px]">
              <div className="mb-[10px] h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
              <div className="text-sm font-bold text-white">{a.en}</div>
              <div className="mt-1 text-xs text-[#8A8A8A]">{a.th}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
