import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { COMPANY_FAQ_DATA } from "@/lib/data";

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
    desc: "ผู้สมัครเล่นมินิเกมประสาทวิทยาศาสตร์ (Neuroscience Games) ที่พัฒนาจากมาตรฐานงานวิจัย วัดจากพฤติกรรมจริง ไม่ใช่คำตอบที่เตรียมมา",
  },
  {
    icon: "🧭",
    title: "น้องตรงปกให้เหตุผลทุกคำแนะนำ",
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

          {/* HR Dashboard Card — left */}
          <div className="relative flex min-w-[280px] flex-[1_1_340px] justify-center">
            <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border border-[rgba(15,15,15,0.1)] bg-white shadow-[0_4px_32px_rgba(15,15,15,0.06)]">
              {/* Header bar */}
              <div className="flex items-center justify-between border-b border-[rgba(15,15,15,0.08)] bg-[#FAFAFA] px-5 py-3">
                <div>
                  <div className="text-[11px] font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">HR Dashboard</div>
                  <div className="text-[13px] font-extrabold text-[#0F0F0F]">Frontend Developer · 14 ผู้สมัคร</div>
                </div>
                <div className="rounded-full bg-[#3BF55C] px-3 py-1 text-[11px] font-bold text-[#0F0F0F]">Live</div>
              </div>

              {/* Sort bar */}
              <div className="flex items-center gap-2 border-b border-[rgba(15,15,15,0.06)] px-5 py-2 text-[11px] text-[#8A8A8A]">
                <span>เรียงตาม</span>
                <span className="font-bold text-[#0F0F0F]">Match Rate ↓</span>
                <span className="ml-auto">Blind Review Mode 🕶️</span>
              </div>

              {/* Candidate rows */}
              {[
                { id: "A12F", role: "Frontend Dev", match: 92, skills: ["Learning Agility", "Critical Thinking"], highlight: true },
                { id: "B7K9", role: "Frontend Dev", match: 84, skills: ["Risk Tolerance", "Collaboration"], highlight: false },
                { id: "C3MX", role: "Frontend Dev", match: 71, skills: ["Resilience", "Decision Making"], highlight: false },
              ].map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 border-b border-[rgba(15,15,15,0.06)] px-5 py-3 ${c.highlight ? "bg-[#F5FFF7]" : ""}`}
                >
                  {/* Anonymous avatar */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F0F0F0] text-[11px] font-extrabold text-[#5A5A5A]">
                    #{c.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-extrabold text-[#0F0F0F]">Candidate #{c.id}</span>
                      {c.highlight && <span className="rounded-full bg-[#3BF55C] px-2 py-0.5 text-[10px] font-bold text-[#0F0F0F]">Top Match</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {c.skills.map((s) => (
                        <span key={s} className="rounded bg-[#F0F0F0] px-1.5 py-0.5 text-[10px] text-[#5A5A5A]">{s}</span>
                      ))}
                    </div>
                  </div>
                  {/* Match score */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[15px] font-extrabold text-[#0F0F0F]">{c.match}%</div>
                    <div className="text-[10px] text-[#8A8A8A]">Match</div>
                  </div>
                  {/* Action */}
                  <button className="flex-shrink-0 rounded-full border border-[rgba(15,15,15,0.15)] px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] hover:bg-[#0F0F0F] hover:text-white transition-colors">
                    นัด
                  </button>
                </div>
              ))}

              {/* Footer hint */}
              <div className="px-5 py-3 text-center text-[11px] text-[#AAAAAA]">
                ชื่อจริงและข้อมูลติดต่อเปิดเผยเมื่อนัดสัมภาษณ์เท่านั้น
              </div>
            </div>
          </div>

          {/* Text — right */}
          <div className="min-w-0 flex-[1_1_400px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] px-4 py-1.5 text-xs font-bold tracking-wider text-[#0F0F0F] uppercase">
              <span>✨ For Enterprises &amp; HR</span>
            </div>

            <h1 className="mb-[22px] text-[clamp(36px,6vw,60px)] leading-[1.08] font-extrabold tracking-[-0.03em]">
              คัดคนที่ใช่
              <br />
              เกินกว่าแค่เรซูเม่
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
