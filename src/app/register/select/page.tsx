import Image from "next/image";
import Link from "next/link";
import { Sparkle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

// Same corner-sparkle treatment as AuthCard's login/register shell — no
// flat accent square (per authcard_accent_square_scope memory: it reads as
// a stray box outside an actual single-form card, and this page is two
// cards side by side, not one). Mirrors /login/select's structure exactly,
// swapped for registration copy/links.
const HEADER_SPARKLES = [
  { top: "0%", left: "8%", size: 20, color: "#F5D949", rotate: -15 },
  { top: "6%", right: "10%", size: 16, color: "#B14DFF", rotate: 12 },
];

const ROLES = [
  {
    mascot: "/mascot/mascot-hero-candidate.png",
    label: "ผู้สมัคร / ผู้หางาน",
    desc: "สมัครสมาชิกฟรีเพื่อเล่นมินิเกมประเมินศักยภาพ และเริ่ม Match กับตำแหน่งงานที่ใช่",
    href: "/register",
    cta: "สมัครสมาชิกผู้สมัคร →",
  },
  {
    mascot: "/mascot/mascot-hero-company.png",
    label: "องค์กร / HR",
    desc: "สมัครใช้งานฟรีเพื่อประกาศตำแหน่งงาน และดู Candidate ที่ Match ด้วย Soft Skill จริง",
    href: "/company/register",
    cta: "สมัครใช้งานองค์กร →",
  },
];

export default function RegisterSelectPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:px-8">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.04) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 35%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 35%,#000 40%,transparent 100%)",
          }}
        />

        <div className="relative w-full max-w-[720px]">
          <div className="relative mb-10 text-center">
            {HEADER_SPARKLES.map((s, i) => (
              <Sparkle
                key={i}
                className="pointer-events-none absolute hidden sm:block"
                style={{ top: s.top, left: s.left, right: s.right, transform: `rotate(${s.rotate}deg)` }}
                width={s.size}
                height={s.size}
                fill={s.color}
                color={s.color}
                strokeWidth={1}
              />
            ))}
            <Image
              src="/mascot/mascot-welcome-auth-oncard.png"
              alt=""
              width={160}
              height={140}
              className="mx-auto mb-2 h-[100px] w-[114px] object-contain sm:h-[120px] sm:w-[137px]"
            />
            <h1 className="text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.03em]">
              เริ่มใช้งานฟรีในฐานะไหน?
            </h1>
            <p className="mt-1.5 text-xs text-[#8A8A8A]">เลือกบทบาทของคุณเพื่อไปหน้าสมัครสมาชิกที่ถูกต้อง</p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
            {ROLES.map((role) => (
              <div
                key={role.href}
                className="flex flex-col items-center rounded-[28px] bg-[#F5F5F5] p-[clamp(24px,3.5vw,36px)] text-center"
              >
                <Image
                  src={role.mascot}
                  alt=""
                  width={140}
                  height={140}
                  className="mb-4 h-[100px] w-[100px] object-contain"
                />
                <div className="mb-2 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
                  {role.label}
                </div>
                <p className="mb-6 text-sm leading-[1.7] text-[#5C5C5C]">{role.desc}</p>
                <Link
                  href={role.href}
                  className="cursor-pointer rounded-full bg-[#0F0F0F] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  {role.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Same role ambiguity as the signup cards above — can't send
              someone straight to /login (candidate) or /company/login (HR)
              without knowing which one they mean, so this also goes through
              a picker rather than a single link. */}
          <div className="mt-8 text-center text-xs text-[#8A8A8A]">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login/select" className="font-extrabold text-[#0F0F0F] underline hover:opacity-80">
              เข้าสู่ระบบที่นี่
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
