import Image from "next/image";

// Directly answers Problem — same "resume only shows the past, not how you
// actually work" framing, but as the fix rather than the pain point.
export function Solution() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(40px,6vw,64px)]">
      <div className="flex flex-col items-center gap-8 rounded-[28px] bg-[#FAFAFA] p-[clamp(32px,5vw,52px)] text-center sm:flex-row sm:gap-12 sm:text-left">
        <Image
          src="/mascot/mascot-ai-thinking.png"
          alt=""
          width={180}
          height={180}
          className="h-[clamp(100px,16vw,160px)] w-[clamp(100px,16vw,160px)] flex-shrink-0 object-contain"
        />
        <div>
          <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
            คนตรงปกแก้ปัญหานี้ยังไง
          </div>
          <h2 className="mb-3 text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.02em]">
            ใช้มินิเกม + AI ดึงตัวตนจริงออกมา แทนการเดาจากกระดาษแผ่นเดียว
          </h2>
          <p className="max-w-[640px] text-sm leading-[1.7] text-[#5C5C5C]">
            แทนที่จะให้ทั้งสองฝั่งเดาใจกันจากเรซูเม่หรือประกาศงาน คนตรงปกให้ผู้สมัครเล่นมินิเกมประสาทวิทยาศาสตร์สั้นๆ
            แล้วให้น้องตรงปกวิเคราะห์ออกมาเป็นข้อมูลที่วัดผลได้จริง ก่อนจับคู่ทั้งสองฝั่งด้วยข้อมูลนั้น
            ไม่ใช่คำโฆษณาตัวเองของใครฝ่ายใดฝ่ายหนึ่ง
          </p>
        </div>
      </div>
    </div>
  );
}
