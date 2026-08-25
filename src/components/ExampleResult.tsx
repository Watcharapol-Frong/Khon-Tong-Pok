"use client";

import { RadarChart } from "@/components/RadarChart";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AXIS_CHIPS, RADAR_DATA } from "@/lib/data";

// Moved out of Hero — showing a result card before explaining what the
// platform even is read like opening on a report before anyone knew what
// they were looking at. Sits right after Solution instead: "what does the
// output actually look like" is the natural next question once someone
// knows AI + behavioral data replaces resume + keyword. Sized up (500px ->
// 560px card) since this is meant to be a page highlight, not a footnote.
export function ExampleResult() {
  const { isMobile } = useBreakpoint();
  const radarSize = isMobile ? 240 : 300;

  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
      <div className="mb-8 text-center">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          Smart Profile Demo
        </div>
        <h2 className="text-[clamp(24px,3.2vw,32px)] font-extrabold tracking-[-0.02em]">
          ผลลัพธ์จริงหลังเล่นจบ ไม่ใช่แค่คำอธิบาย
        </h2>
      </div>

      <div className="relative mx-auto w-full max-w-[560px] rounded-2xl bg-[#F5F5F5] p-[clamp(28px,3.5vw,40px)]">
        <div className="mb-[6px] text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
          ตัวอย่างผลประเมิน
        </div>
        <div className="mb-[18px] text-[17px] font-extrabold">
          คุณกันต์ ธ. — Frontend Dev Candidate
        </div>
        <div className="flex justify-center">
          <RadarChart data={RADAR_DATA} size={radarSize} theme="mono" showLabels animate />
        </div>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {AXIS_CHIPS.map((chip) => (
            <div
              key={chip.en}
              className="rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-3.5 py-3 text-[#0F0F0F]"
            >
              <div className="text-sm font-extrabold">{chip.value}%</div>
              <div className="mt-0.5 text-xs opacity-60">{chip.th}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
