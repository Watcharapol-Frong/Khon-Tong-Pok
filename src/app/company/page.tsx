import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import { AXIS_CHIPS, COMPANY_FAQ_DATA, RADAR_DATA } from "@/lib/data";

export const metadata: Metadata = {
  title: "สำหรับองค์กร — คนตรงปก (KhonTongPok)",
};

const FEATURES = [
  {
    icon: "🕶️",
    title: "Blind Review ไร้อคติ",
    desc: "รอบพิจารณาแรกเห็นแค่กราฟทักษะและ Hard Skill ไม่เห็นชื่อ รูป หรือข้อมูลที่นำไปสู่อคติ เปิดเผยตัวตนก็ต่อเมื่อนัดสัมภาษณ์",
  },
  {
    icon: "🎮",
    title: "วัด Soft Skill จากพฤติกรรมจริง",
    desc: "ผู้สมัครเล่นมินิเกม Neuroscience 4 ด่าน แทนการกรอกแบบสอบถามที่ตอบตามความคาดหวังของ HR",
  },
  {
    icon: "🧭",
    title: "AI ให้เหตุผลทุกคำแนะนำ",
    desc: 'ไม่ใช่แค่ตัวเลข Match Rate ลอยๆ แต่มาพร้อมเหตุผลที่อ่านเข้าใจง่าย เช่น "ปรับตัวเรียนรู้ไวกว่าเกณฑ์ และมีทักษะตรงกับตำแหน่งนี้"',
  },
  {
    icon: "📊",
    title: "ติดตามสถานะแบบเรียลไทม์",
    desc: "จัดการทุกตำแหน่งงานและผู้สมัครในที่เดียว นัดสัมภาษณ์และแจ้งผลได้ในระบบโดยตรง ไม่ต้องสลับไปช่องทางอื่น",
  },
];

const COMPANY_STEPS = [
  {
    n: "01",
    title: "ประกาศตำแหน่งงาน",
    desc: "ตั้งเกณฑ์ทักษะ 6 มิติที่ต้องการสำหรับแต่ละตำแหน่ง ระบบจะใช้เกณฑ์นี้จัดอันดับผู้สมัครให้อัตโนมัติ",
    color: "#FF6E5C",
  },
  {
    n: "02",
    title: "ผู้สมัครเล่นเกม ระบบจัดอันดับให้",
    desc: "ผู้สมัครเล่นมินิเกมและได้ Match Rate ทันที คุณเห็นเฉพาะโปรไฟล์ทักษะแบบ Blind Review ก่อนเสมอ",
    color: "#3BF55C",
  },
  {
    n: "03",
    title: "นัดสัมภาษณ์ผู้สมัครที่ใช่",
    desc: "กดนัดสัมภาษณ์ตรงในระบบ ข้อมูลติดต่อจริงของผู้สมัครจะเปิดเผยให้ก็ต่อเมื่อขั้นตอนนี้เท่านั้น",
    color: "#F5D949",
  },
];

export default function CompanyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      {/* Hero */}
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
          <div className="min-w-0 flex-[1_1_440px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] px-4 py-1.5 text-xs font-bold tracking-wider text-[#0F0F0F] uppercase">
              <span>✨ For Enterprises &amp; HR</span>
            </div>

            <h1 className="mb-[22px] text-[clamp(36px,6vw,60px)] leading-[1.08] font-extrabold tracking-[-0.03em]">
              คัดคนที่ใช่
              <br />
              ไม่ใช่แค่เรซูเม่สวย
            </h1>
            <p className="mb-8 max-w-[520px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] text-[#4A4A4A]">
              แพลตฟอร์มคัดเลือก Candidate คุณภาพด้วยผลประเมิน Soft Skills จริงจากมินิเกม พร้อมระบบ Blind Review
              ไร้อคติ ช่วยให้ทีม HR โฟกัสกับผู้สมัครที่แมตช์จริงตั้งแต่วันแรก
            </p>
            <div className="mb-[18px] flex flex-wrap gap-3">
              <Link
                href="/register"
                className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
              >
                เริ่มใช้งานฟรี
              </Link>
              <Link
                href="/job"
                className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white"
              >
                ดูตัวอย่าง Job Board
              </Link>
            </div>
            <div className="text-[13px] text-[#8A8A8A]">
              ⏱ เริ่มประกาศตำแหน่งงานแรกได้ใน 5 นาที · ไม่ต้องใช้บัตรเครดิต
            </div>
          </div>

          <div className="relative flex min-w-[280px] flex-[1_1_320px] justify-center">
            <div className="w-full max-w-[440px] rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,3vw,36px)]" style={{ position: "relative" }}>
              <div className="absolute top-[-14px] left-[-14px] -z-10 h-14 w-14 bg-[#3BF55C]" />
              <div className="mb-[6px] text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
                ตัวอย่างโปรไฟล์แบบ Blind Review
              </div>
              <div className="mb-[18px] text-[17px] font-extrabold">Candidate #A12F — Frontend Dev</div>
              <div className="flex justify-center">
                <RadarChart data={RADAR_DATA} size={230} theme="mono" showLabels animate />
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

      {/* Features */}
      <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
        <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          ทำไมทีม HR ถึงเลือกเรา
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-6">
              <div className="mb-4 text-2xl">{f.icon}</div>
              <div className="mb-2 text-base font-extrabold tracking-[-0.01em]">{f.title}</div>
              <div className="text-sm leading-[1.7] text-[#5C5C5C]">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works for companies */}
      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(64px,8vw,100px)]">
        <div className="rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,52px)] text-white">
          <div className="mb-[18px] inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#9A9A9A] uppercase">
            สำหรับทีม HR
          </div>
          <h2 className="mb-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
            ใช้งานยังไง
          </h2>
          <p className="mb-[30px] max-w-[640px] text-sm leading-[1.7] text-[#B5B5B5]">
            จากประกาศตำแหน่งงานถึงนัดสัมภาษณ์ผู้สมัครที่ใช่ ทำได้ในระบบเดียว
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-8">
            {COMPANY_STEPS.map((step) => (
              <div key={step.n}>
                <div
                  className="mb-[14px] inline-flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-extrabold text-[#0F0F0F]"
                  style={{ background: step.color }}
                >
                  {step.n}
                </div>
                <div className="mb-[10px] text-lg font-extrabold tracking-[-0.01em] text-white">{step.title}</div>
                <div className="text-sm leading-[1.7] text-[#B5B5B5]">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Faq title="คำถามที่พบบ่อยสำหรับองค์กร" items={COMPANY_FAQ_DATA} />

      {/* Closing CTA */}
      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(56px,7vw,80px)]">
        <div className="rounded-[28px] bg-[#F5F5F5] p-[clamp(36px,5vw,56px)] text-center">
          <h2 className="mb-3.5 text-[clamp(24px,3.4vw,36px)] font-extrabold tracking-[-0.02em]">
            พร้อมหา Candidate ที่ใช่แล้วหรือยัง?
          </h2>
          <p className="mx-auto mb-7 max-w-[480px] text-sm leading-[1.7] text-[#5C5C5C]">
            เริ่มประกาศตำแหน่งงานแรกฟรี ไม่ต้องใช้บัตรเครดิต แล้วให้ระบบช่วยคัดกรองผู้สมัครที่แมตช์จริง
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
            >
              เริ่มใช้งานฟรี
            </Link>
            <Link
              href="/"
              className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white"
            >
              ← กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
