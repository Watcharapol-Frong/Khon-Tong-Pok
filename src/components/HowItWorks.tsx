import Image from "next/image";
import { CandidateHowItWorksSteps, type CandidateStep } from "@/components/CandidateHowItWorksSteps";

// Click any step number to make it the active/expanded one — same
// interaction as the HR side's "ใช้งานยังไง" section (CompanyHowItWorksSteps
// in src/app/company/page.tsx), just candidate-flavored steps/details, so
// both sides of the site read as the same product instead of one looking
// noticeably plainer than the other.
const CANDIDATE_STEPS: CandidateStep[] = [
  {
    n: "01",
    iconKey: "gamepad",
    title: "เล่นเกมประเมินศักยภาพ",
    desc: "ไม่ต้องมีเรซูเม่ก่อนก็เริ่มได้ เล่นมินิเกมเพื่อวัดตัวตนและสไตล์การทำงานจริง จากนั้นระบบช่วยสร้างหรืออัปโหลดเรซูเม่เพื่อยื่นสมัครได้เลย",
    detailType: "tags",
  },
  {
    n: "02",
    iconKey: "chart",
    title: "น้องตรงปกวิเคราะห์ 6 มิติศักยภาพ",
    desc: "แปลงพฤติกรรมการเล่นเป็น Radar Chart และ Feedback Report แบบเจาะลึก",
    detailType: "axes",
  },
  {
    n: "03",
    iconKey: "target",
    title: "Match งานที่ใช่ ไม่ใช่แค่ที่ตรงสเปค",
    desc: "ระบบแนะนำตำแหน่งงานจาก Soft Skill ก่อน แล้วค่อยดู Hard Skill ประกอบ",
    detailType: "match",
  },
];

export function HowItWorks() {
  return (
    <div
      id="how-it-works"
      className="mx-auto w-full scroll-mt-[90px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(40px,6vw,64px)] max-w-[1240px]"
    >
      <div className="relative rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,52px)] text-white">
        <div className="mb-[18px] inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#9A9A9A] uppercase">
          สำหรับผู้สมัคร
        </div>

        <div className="mb-3 flex items-center gap-3">
          <Image
            src="/mascot/mascot-ai-thinking.png"
            alt=""
            width={96}
            height={96}
            className="h-20 w-20 flex-shrink-0 object-contain sm:h-24 sm:w-24"
          />
          <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">ทำงานยังไง</h2>
        </div>
        <p className="mb-[30px] max-w-[640px] text-sm leading-[1.7] text-[#B5B5B5]">
          จากเล่นเกมประเมินศักยภาพถึง Match งานที่ใช่ ทำได้ในระบบเดียว
        </p>

        <CandidateHowItWorksSteps steps={CANDIDATE_STEPS} />
      </div>
    </div>
  );
}
