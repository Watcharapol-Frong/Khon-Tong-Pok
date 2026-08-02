import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import { AXIS_CHIPS, RADAR_DATA } from "@/lib/data";

export const metadata: Metadata = {
  title: "เริ่มเล่นเกมเพื่อประเมิน — คนตรงปก",
};

const FLOW_STEPS = [
  {
    n: "01",
    title: "ยินยอมให้ใช้ข้อมูล",
    desc: "ก่อนเริ่ม ระบบอธิบายชัดเจนว่าจะนำพฤติกรรมการเล่นไปวิเคราะห์เป็นทักษะ 6 ด้านอย่างไร และใครเห็นได้บ้าง คุณกดยืนยันเองก่อนทุกครั้ง",
    color: "#FF6E5C",
  },
  {
    n: "02",
    title: "เล่นมินิเกม 10 นาที",
    desc: "ชุดมินิเกมสั้นๆ ไม่ต้องมีความรู้เฉพาะทาง ไม่มีคำตอบท่องจำ วัดสไตล์การคิดและการตัดสินใจจริงของคุณ",
    color: "#3BF55C",
  },
  {
    n: "03",
    title: "คุยกับ AI Experience Decoder",
    desc: "ต่อด้วยบทสนทนาสั้นๆ กับ AI เพื่อดึงประสบการณ์ทำงานออกมา คุณกำหนดความยาวการคุยเองได้ จะอัปโหลดเรซูเม่ประกอบด้วยก็ได้",
    color: "#4D7CFF",
  },
  {
    n: "04",
    title: "ยืนยันผล แล้วดูงานที่แมตช์",
    desc: "ก่อนบันทึกจริง ระบบให้คุณยืนยัน/แก้ไขทักษะที่สรุปออกมาเสมอ จากนั้นปลดล็อกตำแหน่งงานที่แมตช์กับตัวตนของคุณทันที",
    color: "#F5D949",
  },
];

export default function GamePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.05) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 30% 35%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 30% 35%,#000 40%,transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-[clamp(28px,4vw,64px)] px-[clamp(20px,4vw,48px)] pt-[clamp(48px,8vw,88px)] pb-[clamp(28px,4vw,44px)]">
          <div className="min-w-0 flex-[1_1_440px] text-center md:text-left">
            <div className="mb-[6px] text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
              เริ่มต้นใช้งาน
            </div>
            <h1 className="mb-[22px] text-[clamp(32px,5.4vw,52px)] leading-[1.1] font-extrabold tracking-[-0.03em]">
              เล่นเกม พิสูจน์ตัวตนจริง
              <br />
              ไม่ต้องมีเรซูเม่ก่อนก็เริ่มได้
            </h1>
            <p className="mx-auto mb-8 max-w-[520px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] text-[#4A4A4A] md:mx-0">
              ตอบคำถามสั้นๆ ให้ความยินยอม แล้วเล่นมินิเกมประเมินตัวตนกับเราไม่ถึง 10 นาที
              จากนั้นคุยกับ AI สั้นๆ เพื่อดึงประสบการณ์ทำงานของคุณออกมา ให้ HR เห็นจุดเด่นจริงตั้งแต่วันแรก
            </p>
            <div className="mb-[18px] flex flex-wrap justify-center gap-3 md:justify-start">
              <span className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white">
                เริ่มเล่นเกมตอนนี้
              </span>
              <Link
                href="/"
                className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F]"
              >
                กลับหน้าแรก
              </Link>
            </div>
            <div className="text-[13px] text-[#8A8A8A]">
              ⏱ ใช้เวลาไม่ถึง 10 นาที · ไม่ต้องมีประสบการณ์ก็เล่นได้
            </div>
          </div>

          <div className="relative flex min-w-[280px] flex-[1_1_320px] justify-center">
            <div className="relative w-full max-w-[440px] rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,3vw,36px)]">
              <div className="absolute top-[-14px] left-[-14px] -z-10 h-14 w-14 bg-[#4D7CFF]" />
              <div className="mb-[6px] text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
                ตัวอย่างผลลัพธ์เมื่อเล่นจบ
              </div>
              <div className="mb-[18px] text-[17px] font-extrabold">โปรไฟล์ตัวตนของคุณ</div>
              <div className="flex justify-center">
                <RadarChart data={RADAR_DATA} size={280} theme="mono" showLabels animate />
              </div>
              <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
                {AXIS_CHIPS.map((chip) => (
                  <div
                    key={chip.en}
                    className="rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-[11px] py-[9px] text-[11px] text-[#0F0F0F]"
                  >
                    <div className="font-extrabold">{chip.value}%</div>
                    <div className="opacity-60">{chip.th}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
        <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          ขั้นตอนการเล่น
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
          {FLOW_STEPS.map((step) => (
            <div key={step.n}>
              <div
                className="mb-[14px] inline-flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-extrabold text-[#0F0F0F]"
                style={{ background: step.color }}
              >
                {step.n}
              </div>
              <div className="mb-[10px] text-lg font-extrabold tracking-[-0.01em]">{step.title}</div>
              <div className="text-sm leading-[1.7] text-[#5C5C5C]">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(40px,6vw,64px)]">
        <div className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,3vw,32px)]">
          <div className="mb-2 text-sm font-extrabold">เรื่องความเป็นส่วนตัวของข้อมูล</div>
          <p className="max-w-[720px] text-[13px] leading-[1.7] text-[#5C5C5C]">
            ก่อนเริ่มเล่น ระบบจะขอความยินยอมจากคุณอย่างชัดเจนก่อนเสมอ
            โดยไม่เก็บข้อมูลส่วนเกินที่ไม่จำเป็น ในรอบพิจารณาแรก
            บริษัทจะเห็นแค่กราฟทักษะและความสามารถของคุณ ไม่เห็นชื่อจริงหรือหน้าตา
            ข้อมูลติดต่อจริงจะถูกเปิดเผยก็ต่อเมื่อบริษัทกดนัดสัมภาษณ์คุณเท่านั้น
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
