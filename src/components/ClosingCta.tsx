import Link from "next/link";

export function ClosingCta() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(56px,7vw,80px)]">
      <div className="rounded-[28px] bg-[#F5F5F5] p-[clamp(36px,5vw,56px)] text-center">
        <h2 className="mb-3.5 text-[clamp(24px,3.4vw,36px)] font-extrabold tracking-[-0.02em]">
          พร้อมพิสูจน์ตัวตนของคุณหรือยัง?
        </h2>
        <p className="mx-auto mb-7 max-w-[480px] text-sm leading-[1.7] text-[#5C5C5C]">
          ใช้เวลาไม่ถึง 10 นาที ไม่ต้องมีประสบการณ์ก็เริ่มได้ แล้วปลดล็อกตำแหน่งงานที่แมตช์กับตัวตนจริงของคุณ
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/game"
            className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white"
          >
            เริ่มหางาน เล่นเกมเลย
          </Link>
          <Link
            href="/company"
            className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F]"
          >
            หา Candidate (HR)
          </Link>
        </div>
      </div>
    </div>
  );
}
