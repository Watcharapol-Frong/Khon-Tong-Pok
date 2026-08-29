import { ClosingCta } from "@/components/ClosingCta";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { JobMatching } from "@/components/JobMatching";
import { Navbar } from "@/components/Navbar";

// Back to the original structure after the "General Landing" experiment
// (Problem/Solution/PlatformOverview/ProcessOverview/MatchShowcase/Trust)
// didn't land — those sections and their components have been removed.
// HowItWorks and StrategyPanel dropped from Home too (still used on
// /game, where they stay) — Hero's own CTAs ("สำหรับผู้หางาน" /
// "สำหรับองค์กร") still carry the audience fork.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <JobMatching />
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
