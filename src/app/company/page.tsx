import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  Check,
  Clock,
  Compass,
  EyeOff,
  Gamepad2,
  ShieldCheck,
  Sparkle,
  Star,
} from "lucide-react";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { CompanyNavbar } from "@/components/CompanyNavbar";
import { CompanyHowItWorksSteps, type CompanyStep } from "@/components/CompanyHowItWorksSteps";
import { RadarChart } from "@/components/RadarChart";
import { COMPANY_FAQ_DATA } from "@/lib/data";

export const metadata: Metadata = {
  title: "สำหรับองค์กร — คนตรงปก (KhonTongPok)",
};

// Same handful-not-a-shower sparkle treatment as the auth cards, reusing
// the same pastel set for visual consistency across the site.
const HERO_SPARKLES = [
  { top: "4%", left: "8%", size: 20, color: "#F5D949", rotate: -15 },
  { top: "10%", right: "22%", size: 15, color: "#B14DFF", rotate: 20 },
  { bottom: "18%", left: "4%", size: 16, color: "#4D7CFF", rotate: 12 },
  { bottom: "6%", right: "10%", size: 18, color: "#FF5CA8", rotate: -10 },
];

const TOP_STRENGTHS = ["คิดเชิงวิเคราะห์", "เรียนรู้ไว", "ใส่ใจรายละเอียด"];

const FEATURES = [
  {
    icon: EyeOff,
    title: "Blind Review ไร้อคติ",
    desc: "เห็นแค่กราฟทักษะและ Hard Skill ไม่เห็นชื่อหรือรูป จนกว่าจะถึงรอบสัมภาษณ์",
  },
  {
    icon: Gamepad2,
    title: "วัด Soft Skill จากพฤติกรรมจริง",
    desc: "วัดจากพฤติกรรมจริงผ่านมินิเกมประสาทวิทยาศาสตร์ ไม่ใช่คำตอบที่เตรียมมา",
  },
  {
    icon: Compass,
    title: "น้องตรงปกให้เหตุผลทุกคำแนะนำ",
    desc: "มาพร้อมเหตุผลที่อ่านเข้าใจง่าย ไม่ใช่แค่ตัวเลข Match Rate ลอยๆ",
  },
  {
    icon: BarChart3,
    title: "ติดตามสถานะแบบเรียลไทม์",
    desc: "จัดการตำแหน่งงานและผู้สมัครในที่เดียว นัดสัมภาษณ์ได้ในระบบโดยตรง",
  },
];

// Click any step to make it the active one (see CompanyHowItWorksSteps) —
// each reveals its own detail (tags / match rate / interview status).
// Middle step starts active by default since AI matching is the real
// value proposition, but it's no longer permanently hardcoded that way.
const COMPANY_STEPS: CompanyStep[] = [
  {
    n: "01",
    iconKey: "file",
    title: "ประกาศตำแหน่งงาน",
    desc: "ตั้งเกณฑ์ทักษะ 6 มิติที่ต้องการสำหรับแต่ละตำแหน่ง ระบบจะใช้เกณฑ์นี้จัดอันดับผู้สมัครให้อัตโนมัติ",
    detailType: "tags",
  },
  {
    n: "02",
    iconKey: "bot",
    title: "ผู้สมัครเล่นเกม ระบบจัดอันดับให้",
    desc: "ผู้สมัครเล่นมินิเกมและได้ Match Rate ทันที คุณเห็นเฉพาะโปรไฟล์ทักษะแบบ Blind Review ก่อนเสมอ",
    detailType: "match",
  },
  {
    n: "03",
    iconKey: "calendar",
    title: "นัดสัมภาษณ์ผู้สมัครที่ใช่",
    desc: "กดนัดสัมภาษณ์ตรงในระบบ ข้อมูลติดต่อจริงของผู้สมัครจะเปิดเผยให้ก็ต่อเมื่อขั้นตอนนี้เท่านั้น",
    detailType: "status",
  },
];

export default function CompanyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <CompanyNavbar />

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

          {/* Mascot + floating product-data cards — left. Composition
              borrowed from the reference image (mascot centered, small
              stat cards floating around it), but every card reuses the
              app's own real components/colors (RadarChart, the existing
              green-for-Blind-Review and amber-for-standout conventions)
              instead of the reference's arbitrary lavender/pink tints —
              keeps it "ดูเหมือนระบบจริง" per the style guide rather than
              generic decorative graphics, and pink stays mascot-only. */}
          <div className="relative flex min-w-[280px] flex-[1_1_460px] flex-col items-center py-6 sm:block sm:min-w-[640px] sm:py-10">
            {HERO_SPARKLES.map((s, i) => (
              <Sparkle
                key={i}
                className="pointer-events-none absolute hidden sm:block"
                style={{
                  top: s.top,
                  bottom: s.bottom,
                  left: s.left,
                  right: s.right,
                  transform: `rotate(${s.rotate}deg)`,
                }}
                width={s.size}
                height={s.size}
                fill={s.color}
                color={s.color}
                strokeWidth={1}
              />
            ))}

            {/*
              These floating cards only appear sm+ — below that this column
              is too narrow to fit any of them beside a mascot worth looking
              at without collision, so mobile gets the compact 2x2 grid
              further down instead (normal document flow, not absolute
              positioning, so there's no overlap physics to get wrong).
              Mascot is a FIXED 260px here (not responsive-scaling) so this
              gap math holds: half its width (130px) + 16px clearance =
              146px is how far each card's near edge sits from center,
              regardless of how wide this column actually renders.
            */}

            {/* Soft Skill — top-left */}
            <div className="absolute top-[4%] right-[calc(50%+146px)] hidden w-[148px] rounded-2xl bg-[#FAFAFA] p-3 sm:block">
              <div className="mb-1 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Soft Skill
              </div>
              <div className="flex justify-center">
                <RadarChart
                  data={[
                    { axis: "สื่อสาร", value: 82 },
                    { axis: "ภาวะผู้นำ", value: 70 },
                    { axis: "แก้ปัญหา", value: 88 },
                    { axis: "ปรับตัว", value: 75 },
                    { axis: "ทำงานเป็นทีม", value: 90 },
                  ]}
                  size={100}
                  theme="mono"
                  showLabels={false}
                  animate={false}
                />
              </div>
            </div>

            {/* Blind Review — bottom-left */}
            <div className="absolute bottom-[8%] right-[calc(50%+146px)] hidden w-[172px] rounded-2xl bg-[#FAFAFA] p-3.5 sm:block">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                <EyeOff className="h-3 w-3" strokeWidth={2} />
                Blind Review
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(59,245,92,0.15)]">
                  <ShieldCheck className="h-4 w-4 text-[#0f5c22]" strokeWidth={2} />
                </div>
                <div className="text-[11px] leading-snug font-bold text-[#0F0F0F]">
                  ปิดข้อมูลส่วนตัว
                  <br />
                  ลดอคติ 100%
                </div>
              </div>
            </div>

            {/* Match Insight — top-right */}
            <div className="absolute top-0 left-[calc(50%+146px)] hidden w-[140px] rounded-2xl bg-[#FAFAFA] p-3.5 sm:block">
              <div className="mb-1 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Match Insight
              </div>
              <div className="text-2xl font-extrabold text-[#0F0F0F]">92%</div>
              <div className="mt-1 flex gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
                ))}
                <Star className="h-3 w-3 text-[#E5E5E5]" strokeWidth={1.75} />
              </div>
            </div>

            {/* Top Strengths — bottom-right */}
            <div className="absolute bottom-[2%] left-[calc(50%+146px)] hidden w-[176px] rounded-2xl bg-[#FAFAFA] p-3.5 sm:block">
              <div className="mb-2 text-[10px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                Top Strengths
              </div>
              <div className="flex flex-col gap-1.5">
                {TOP_STRENGTHS.map((s) => (
                  <div key={s} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F0F0F]">
                    <Check className="h-3 w-3 flex-shrink-0 text-[#0f5c22]" strokeWidth={2.5} />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <Image
              src="/mascot/mascot-hero-company.png"
              alt=""
              width={320}
              height={336}
              className="relative z-10 mx-auto block h-auto w-[220px] object-contain sm:w-[260px]"
            />

            {/* Mobile-only: same four data points, but as a plain 2x2 grid
                below the mascot instead of floating around it — normal
                flow, so there's nothing for it to collide with. */}
            <div className="mt-6 grid w-full max-w-[320px] grid-cols-2 gap-2.5 sm:hidden">
              <div className="rounded-2xl bg-[#FAFAFA] p-3">
                <div className="mb-1.5 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                  Soft Skill
                </div>
                <div className="flex justify-center">
                  <RadarChart
                    data={[
                      { axis: "สื่อสาร", value: 82 },
                      { axis: "ภาวะผู้นำ", value: 70 },
                      { axis: "แก้ปัญหา", value: 88 },
                      { axis: "ปรับตัว", value: 75 },
                      { axis: "ทำงานเป็นทีม", value: 90 },
                    ]}
                    size={70}
                    theme="mono"
                    showLabels={false}
                    animate={false}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-[#FAFAFA] p-3">
                <div className="mb-1.5 flex items-center gap-1 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                  <EyeOff className="h-2.5 w-2.5" strokeWidth={2} />
                  Blind Review
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(59,245,92,0.15)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0f5c22]" strokeWidth={2} />
                </div>
                <div className="mt-1.5 text-[10px] leading-snug font-bold text-[#0F0F0F]">
                  ปิดข้อมูลส่วนตัว ลดอคติ 100%
                </div>
              </div>
              <div className="rounded-2xl bg-[#FAFAFA] p-3">
                <div className="mb-1 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                  Match Insight
                </div>
                <div className="text-xl font-extrabold text-[#0F0F0F]">92%</div>
                <div className="mt-1 flex gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-[#F5D949] text-[#856700]" strokeWidth={1.75} />
                  ))}
                  <Star className="h-2.5 w-2.5 text-[#E5E5E5]" strokeWidth={1.75} />
                </div>
              </div>
              <div className="rounded-2xl bg-[#FAFAFA] p-3">
                <div className="mb-1.5 text-[9px] font-bold tracking-wide text-[#8A8A8A] uppercase">
                  Top Strengths
                </div>
                <div className="flex flex-col gap-1">
                  {TOP_STRENGTHS.map((s) => (
                    <div key={s} className="flex items-center gap-1 text-[10px] font-semibold text-[#0F0F0F]">
                      <Check className="h-2.5 w-2.5 flex-shrink-0 text-[#0f5c22]" strokeWidth={2.5} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Text — right */}
          <div className="min-w-0 flex-[1_1_400px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FAFAFA] px-4 py-1.5 text-xs font-bold tracking-wider text-[#0F0F0F] uppercase">
              <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
              <span>For Enterprises &amp; HR</span>
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
                href="/company/register"
                className="cursor-pointer rounded-full bg-[#0F0F0F] px-[30px] py-4 text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
              >
                เริ่มใช้งานฟรี
              </Link>
              <Link
                href="/job"
                className="cursor-pointer rounded-full bg-[#FAFAFA] px-7 py-[15px] text-[15px] font-bold text-[#0F0F0F] transition-colors hover:bg-[#0F0F0F] hover:text-white"
              >
                ดูตัวอย่าง Job Board
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[#8A8A8A]">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              เริ่มประกาศตำแหน่งงานแรกได้ใน 5 นาที · ไม่ต้องใช้บัตรเครดิต
            </div>
          </div>

        </div>
      </div>

      {/* Features */}
      <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,64px)]">
        <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
          ทำไมทีม HR ถึงเลือกเรา
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-[#FAFAFA] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <f.icon className="h-5 w-5 text-[#0F0F0F]" strokeWidth={1.75} />
              </div>
              <div className="mb-2 text-base font-extrabold tracking-[-0.01em]">{f.title}</div>
              <div className="text-sm leading-[1.7] text-[#5C5C5C]">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works for companies */}
      <div
        id="how-it-works"
        className="mx-auto w-full scroll-mt-[90px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(64px,8vw,100px)] max-w-[1240px]"
      >
        <div className="relative rounded-[28px] bg-[#0F0F0F] p-[clamp(32px,5vw,52px)] text-white">
          <div className="mb-[18px] inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#9A9A9A] uppercase">
            สำหรับทีม HR
          </div>

          {/* Mascot sits beside the heading — sized to actually read as a
              character, not a tiny inline icon. */}
          <div className="mb-3 flex items-center gap-3">
            <Image
              src="/mascot/mascot-ai-thinking.png"
              alt=""
              width={96}
              height={96}
              className="h-20 w-20 flex-shrink-0 object-contain sm:h-24 sm:w-24"
            />
            <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">
              ใช้งานยังไง
            </h2>
          </div>
          <p className="mb-[30px] max-w-[640px] text-sm leading-[1.7] text-[#B5B5B5]">
            จากประกาศตำแหน่งงานถึงนัดสัมภาษณ์ผู้สมัครที่ใช่ ทำได้ในระบบเดียว
          </p>
          <CompanyHowItWorksSteps steps={COMPANY_STEPS} />
        </div>
      </div>

      <Faq title="คำถามที่พบบ่อยสำหรับองค์กร" items={COMPANY_FAQ_DATA} />

      {/* Closing CTA — composition borrowed from the reference (light
          panel, eyebrow badge, mascot large beside the headline, one
          highlighted word, checklist trust-row) but translated into the
          page's own light/mascot-only-accent palette instead of the
          reference's pink theme. Kept the single strong CTA from the
          earlier UX pass — no "back to home" escape hatch right at the
          conversion point. */}
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
                พร้อมหา Candidate ที่ใช่แล้วหรือยัง?
              </h2>
              <p className="mb-6 text-sm leading-[1.6] text-[#B5B5B5] sm:max-w-[420px]">
                เริ่มประกาศตำแหน่งงานแรกฟรี ให้ระบบช่วยคัดกรองผู้สมัครที่แมตช์จริง
              </p>

              <Link
                href="/company/register"
                className="inline-block cursor-pointer rounded-full bg-white px-8 py-4 text-[15px] font-bold text-[#0F0F0F] transition-all hover:opacity-90 active:scale-95"
              >
                เริ่มใช้งานฟรี →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
