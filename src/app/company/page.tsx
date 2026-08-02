import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "สำหรับองค์กร — คนตรงปก",
};

const VALUE_PROPS = [
  {
    title: "เห็น Soft Skill ก่อนเจอตัวจริง",
    desc: "ดูวิธีคิดและสไตล์การทำงานจากพฤติกรรมการเล่นเกมจริง ไม่ใช่แค่คำในเรซูเม่ที่เขียนเองได้",
    color: "#4D7CFF",
  },
  {
    title: "Blind Review ลดอคติ",
    desc: "รอบพิจารณาแรกเห็นแค่กราฟทักษะและความสามารถ ไม่เห็นชื่อจริงหรือหน้าตา เปิดเผยก็ต่อเมื่อคุณกดนัดสัมภาษณ์",
    color: "#3BF55C",
  },
  {
    title: "เหตุผลการแมตช์ชัดเจน",
    desc: "ทุกคำแนะนำมาพร้อมเหตุผลที่อ่านเข้าใจง่าย ไม่ใช่แค่ตัวเลขคะแนนลอยๆ ที่ไม่รู้ที่มา",
    color: "#F5D949",
  },
  {
    title: "ประหยัดเวลาคัดกรอง",
    desc: "คัดกรองเบื้องต้นด้วยทักษะจริงจากผลเกม ก่อนนัดสัมภาษณ์ ลดเวลาที่เสียไปกับผู้สมัครที่ไม่ตรงสเปค",
    color: "#FF6E5C",
  },
];

export default function CompanyPage() {
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
              สำหรับองค์กร
            </div>
            <h1 className="mb-[22px] text-[clamp(32px,5.4vw,52px)] leading-[1.1] font-extrabold tracking-[-0.03em]">
              หา Candidate ที่ใช่
              <br />
              จากตัวตนจริง ไม่ใช่แค่เรซูเม่
            </h1>
            <p className="mx-auto mb-8 max-w-[520px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] text-[#4A4A4A] md:mx-0">
              ดูทักษะและวิธีคิดของผู้สมัครจากพฤติกรรมการเล่นเกมจริง แทนคำในเรซูเม่ที่เขียนเองได้
              พร้อมลดอคติตั้งแต่รอบแรกด้วยรีวิวแบบไม่เห็นชื่อและหน้าตา
            </p>
            <div className="mb-[18px] flex flex-wrap justify-center gap-3 md:justify-start">
              <span className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white">
                เริ่มต้นใช้งาน
              </span>
              <span className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F]">
                ติดต่อฝ่ายขาย
              </span>
            </div>
            <div className="text-[13px] text-[#8A8A8A]">
              ไม่มีค่าใช้จ่ายในการเริ่มต้น · ใช้งานได้ทันทีหลังสมัคร
            </div>
          </div>

          <div className="relative flex min-w-[280px] flex-[1_1_320px] justify-center">
            <div className="relative w-full max-w-[420px] rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,3vw,36px)]">
              <div className="absolute top-[-14px] left-[-14px] -z-10 h-14 w-14 bg-[#FF6E5C]" />
              <div className="mb-[6px] text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
                ตัวอย่างผู้สมัคร · Blind Review
              </div>
              <div className="mb-4 flex items-start justify-between gap-2.5">
                <div className="text-[17px] font-extrabold">Candidate #A014</div>
                <div className="text-xs font-extrabold">Frontend Dev</div>
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                <span
                  className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: "rgba(77,124,255,0.1)", color: "#4D7CFF" }}
                >
                  Critical Thinking ≥80%
                </span>
                <span
                  className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: "rgba(255,110,92,0.1)", color: "#d63d28" }}
                >
                  Learning Agility ≥75%
                </span>
                <span
                  className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: "rgba(255,92,168,0.1)", color: "#c22d76" }}
                >
                  Collaboration ≥85%
                </span>
              </div>
              <div className="mb-5 text-[11px] text-[#8A8A8A]">
                React · TypeScript · Tailwind CSS · REST API
              </div>
              <div className="rounded-xl border border-dashed border-[rgba(15,15,15,0.15)] bg-white px-4 py-3 text-[11px] leading-[1.6] text-[#8A8A8A]">
                🔒 ชื่อและรูปโปรไฟล์จะแสดงก็ต่อเมื่อคุณกดนัดสัมภาษณ์
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
        <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          ทำไมต้องคนตรงปก
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VALUE_PROPS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6"
            >
              <div
                className="mb-[14px] h-2.5 w-2.5 rounded-full"
                style={{ background: item.color }}
              />
              <div className="mb-[10px] text-lg font-extrabold tracking-[-0.01em]">
                {item.title}
              </div>
              <div className="text-sm leading-[1.7] text-[#5C5C5C]">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pb-[clamp(56px,7vw,80px)]">
        <div className="rounded-[28px] bg-[#F5F5F5] p-[clamp(36px,5vw,56px)] text-center">
          <h2 className="mb-3.5 text-[clamp(24px,3.4vw,36px)] font-extrabold tracking-[-0.02em]">
            พร้อมหา Candidate ที่ใช่แล้วหรือยัง?
          </h2>
          <p className="mx-auto mb-7 max-w-[480px] text-sm leading-[1.7] text-[#5C5C5C]">
            เริ่มโพสต์งานและเห็นผู้สมัครที่แมตช์กับตัวตนของทีมคุณได้ทันที
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white">
              เริ่มต้นใช้งาน
            </span>
            <Link
              href="/"
              className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F]"
            >
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
