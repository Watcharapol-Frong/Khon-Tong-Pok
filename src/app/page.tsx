import { ClosingCta } from "@/components/ClosingCta";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { JobMatching } from "@/components/JobMatching";
import { Navbar } from "@/components/Navbar";
import { StrategyPanel } from "@/components/StrategyPanel";

// Back to the original structure after the "General Landing" experiment
// (Problem/Solution/PlatformOverview/ProcessOverview/MatchShowcase/Trust)
// didn't land — those sections and their components have been removed.
// Hero's own CTAs ("สำหรับผู้หางาน" / "สำหรับองค์กร") still carry the
// audience fork; everything else keeps whatever fixes/polish it picked up
// this session (marquee auto-scroll, category filters, FAQ accordion
// accessibility, StrategyPanel's monochrome redesign, honest CTA copy).
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <JobMatching />
      <HowItWorks />
      <StrategyPanel />
      <Faq />
      <ClosingCta
        title="พร้อมเริ่มต้นแล้วหรือยัง?"
        primaryHref="/game"
        primaryLabel="เริ่มต้นสำหรับผู้หางาน →"
        secondaryHref="/company"
        secondaryLabel="เริ่มต้นสำหรับองค์กร →"
      />
      <Footer />
    </div>
  );
}
