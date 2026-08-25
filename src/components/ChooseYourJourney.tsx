import Image from "next/image";
import Link from "next/link";

const JOURNEYS = [
  {
    mascot: "/mascot/mascot-hero-candidate.png",
    label: "สำหรับผู้หางาน",
    title: "หางานที่ใช่ ด้วยตัวตนจริงของคุณ",
    desc: "เล่นมินิเกมประเมินศักยภาพ ไม่ต้องมีเรซูเม่ก่อนก็เริ่มได้ รับ Smart Profile แล้ว Match กับตำแหน่งงานที่ตรงกับตัวคุณจริงๆ",
    href: "/game",
    cta: "เริ่มเล่นเกมเพื่อประเมิน →",
  },
  {
    mascot: "/mascot/mascot-hero-company.png",
    label: "สำหรับ HR / องค์กร",
    title: "หา Candidate ที่เข้ากับทีมจริง ไม่ใช่แค่ตรงสเปค",
    desc: "ดู Soft Skill ผู้สมัครแบบวัดผลได้ พร้อม Blind Review ที่ลดอคติตั้งแต่รอบแรก ไม่ต้องมีทีม HR ขนาดใหญ่หรือระบบ ATS เดิมก็เริ่มได้",
    href: "/company",
    cta: "หา Candidate ตอนนี้ →",
  },
];

export function ChooseYourJourney() {
  return (
    <div
      id="choose-your-journey"
      className="mx-auto w-full max-w-[1240px] scroll-mt-[90px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]"
    >
      <div className="mb-8 max-w-[640px]">
        <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
          Choose Your Journey
        </div>
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          คุณมาในฐานะไหน?
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
        {JOURNEYS.map((j) => (
          <div
            key={j.label}
            className="flex flex-col items-center rounded-[28px] bg-[#FAFAFA] p-[clamp(28px,4vw,40px)] text-center"
          >
            <Image src={j.mascot} alt="" width={140} height={140} className="mb-4 h-[110px] w-[110px] object-contain" />
            <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">{j.label}</div>
            <h3 className="mb-2.5 text-lg font-extrabold tracking-[-0.01em]">{j.title}</h3>
            <p className="mb-6 max-w-[380px] text-sm leading-[1.7] text-[#5C5C5C]">{j.desc}</p>
            <Link
              href={j.href}
              className="cursor-pointer rounded-full bg-[#0F0F0F] px-7 py-[13px] text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {j.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
