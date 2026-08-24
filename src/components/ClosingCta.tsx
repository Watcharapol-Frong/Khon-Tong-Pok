import Image from "next/image";
import Link from "next/link";
import { Sparkle } from "lucide-react";

// Same composition as the company-side closing CTA (src/app/company/page.tsx):
// black rounded panel, sparkle accents, mascot beside the heading instead of
// a plain light box with no character — this page's version had drifted to
// its own lighter, mascot-less treatment.
export function ClosingCta() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(56px,7vw,80px)]">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,56px)]">
        <Sparkle
          className="pointer-events-none absolute top-[10%] left-[6%] hidden sm:block"
          width={20}
          height={20}
          fill="#F5D949"
          color="#F5D949"
          strokeWidth={1}
        />
        <Sparkle
          className="pointer-events-none absolute right-[8%] bottom-[14%] hidden rotate-12 sm:block"
          width={16}
          height={16}
          fill="#B14DFF"
          color="#B14DFF"
          strokeWidth={1}
        />

        <div className="relative flex flex-col items-center gap-8 text-center sm:flex-row sm:gap-12 sm:text-left">
          <Image
            src="/mascot/mascot-start.png"
            alt=""
            width={220}
            height={232}
            className="h-[clamp(130px,22vw,200px)] w-[clamp(123px,21vw,189px)] flex-shrink-0 object-contain"
          />

          <div className="flex-1">
            <h2 className="mb-3 text-[clamp(26px,3.6vw,40px)] font-extrabold tracking-[-0.02em] text-white">
              พร้อมพิสูจน์ตัวตนของคุณหรือยัง?
            </h2>
            <p className="mb-6 text-sm leading-[1.6] text-[#B5B5B5] sm:max-w-[420px]">
              ใช้เวลาไม่ถึง 10 นาที ไม่ต้องมีประสบการณ์ก็เริ่มได้ แล้วปลดล็อกตำแหน่งงานที่แมตช์กับตัวตนจริงของคุณ
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link
                href="/game"
                className="inline-block cursor-pointer rounded-full bg-white px-8 py-4 text-[15px] font-bold text-[#0F0F0F] transition-all hover:opacity-90 active:scale-95"
              >
                เริ่มหางาน เล่นเกมเลย →
              </Link>
              <Link
                href="/company"
                className="inline-block cursor-pointer rounded-full border-[1.5px] border-white/30 px-7 py-[15px] text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              >
                หา Candidate (HR)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
