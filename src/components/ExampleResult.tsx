"use client";

import { RadarChart } from "@/components/RadarChart";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AXIS_CHIPS, RADAR_DATA } from "@/lib/data";

// Moved out of Hero — showing a result card before explaining what the
// platform even is read like opening on a report before anyone knew what
// they were looking at. Now sits right after How It Works, where "what
// does the output actually look like" is the question someone's asking
// once they understand the mechanism.
export function ExampleResult() {
  const { isMobile } = useBreakpoint();
  const radarSize = isMobile ? 230 : 290;

  return (
    <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,56px)]">
      <div className="mb-8 text-center">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          Example Result
        </div>
        <h2 className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.02em]">
          ตัวอย่าง Smart Profile หลังเล่นจบ
        </h2>
      </div>

      <div className="relative mx-auto w-full max-w-[500px] rounded-2xl bg-[#F5F5F5] p-[clamp(24px,3vw,36px)]">
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
