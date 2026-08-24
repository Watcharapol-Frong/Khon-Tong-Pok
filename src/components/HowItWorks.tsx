import Image from "next/image";
import { CandidateHowItWorksSteps, type CandidateStep } from "@/components/CandidateHowItWorksSteps";

// Click any step number to make it the active/expanded one — same
// interaction as the HR side's "ใช้งานยังไง" section (CompanyHowItWorksSteps
// in src/app/company/page.tsx), just candidate-flavored steps/details, so
// both sides of the site read as the same product instead of one looking
// noticeably plainer than the other.
//
// 4 steps, not 3 — mirrors the actual AssessmentStepBar sequence used
// throughout onboarding (Role Selection → Mini-Games → น้องตรงปก → Smart
// Profile) instead of compressing it. Job matching isn't a separate
// tracked step in the app, so it's folded into what Smart Profile unlocks.
const CANDIDATE_STEPS: CandidateStep[] = [
  {
    n: "01",
    iconKey: "users",
    title: "เลือกสถานะผู้สมัคร",
    desc: "บอกเราว่าคุณอยู่ช่วงไหนของสายอาชีพ เพื่อปรับคำถามและบริบทในมินิเกมให้ตรงกับตัวคุณที่สุด",
  },
  {
    n: "02",
    iconKey: "gamepad",
    title: "เล่นเกมประเมินศักยภาพ",
    desc: "ไม่ต้องมีเรซูเม่ก่อนก็เริ่มได้ เล่นมินิเกม Neuroscience Games เพื่อวัดตัวตนและสไตล์การทำงานจริง",
  },
  {
    n: "03",
    iconKey: "chart",
    title: "น้องตรงปกวิเคราะห์ 6 มิติศักยภาพ",
    desc: "แปลงพฤติกรรมการเล่นเป็น Radar Chart และ Feedback Report แบบเจาะลึก จากนั้นระบบช่วยสร้างหรืออัปโหลดเรซูเม่เพื่อยื่นสมัครได้เลย",
  },
  {
    n: "04",
    iconKey: "target",
    title: "Match งานที่ใช่ ไม่ใช่แค่ที่ตรงสเปค",
    desc: "ได้ Smart Profile พร้อม Match Rate ระบบแนะนำตำแหน่งงานจาก Soft Skill ก่อน แล้วค่อยดู Hard Skill ประกอบ",
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
          จากเลือกสถานะผู้สมัครถึง Match งานที่ใช่ ครบ 4 ขั้นตอนในระบบเดียว
        </p>

        <CandidateHowItWorksSteps steps={CANDIDATE_STEPS} />
      </div>
    </div>
  );
}
