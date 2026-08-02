import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ประเมินด้วยมินิเกม — คนตรงปก (KhonTongPok)",
};

export default function GamePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-white">
      <Navbar />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden py-16 sm:py-24">
        {/* Background Grid Pattern & Ambient Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 50%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 50%,#000 40%,transparent 100%)",
          }}
        />

        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#3BF55C] opacity-15 blur-[120px]" />

        <div className="relative mx-auto w-full max-w-[900px] px-4 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] px-4 py-1.5 text-xs font-bold tracking-wider text-[#3BF55C] uppercase backdrop-blur-md">
            <span>🎮 NEUROSCIENCE GAME ASSESSMENT</span>
          </div>

          <h1 className="mb-6 text-[clamp(32px,6vw,56px)] font-extrabold tracking-[-0.03em] leading-[1.15]">
            โหมดมินิเกมประเมินศักยภาพ
            <br />
            <span className="bg-gradient-to-r from-white via-[#E5E5E5] to-[#8A8A8A] bg-clip-text text-transparent">
              Coming Soon · กำลังพัฒนาและเปิดให้บริการเร็วๆ นี้
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-[620px] text-[clamp(14px,1.8vw,16px)] leading-[1.7] text-[#9A9A9A]">
            ชุดมินิเกม Neuroscience 4 ด่านเพื่อวิเคราะห์ทักษะ 6 ด้าน กำลังอยู่ในขั้นตอนการอัปเกรดระบบประเมินผลระดับสูง คุณสามารถเข้าสู่ขั้นตอนทดลองประเมินและสกัดทักษะด้วยน้องตรงปกได้ทันที!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-full bg-[#3BF55C] px-8 py-3.5 text-xs font-extrabold text-[#0F0F0F] transition-all hover:opacity-90 active:scale-95 shadow-md"
            >
              ทดลองเริ่มแบบประเมินทันที →
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[rgba(255,255,255,0.2)] px-6 py-3.5 text-xs font-bold text-white transition-all hover:bg-white hover:text-[#0F0F0F]"
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
