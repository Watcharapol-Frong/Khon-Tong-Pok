import { ClosingCta } from "@/components/ClosingCta";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { MatchShowcase } from "@/components/MatchShowcase";
import { Navbar } from "@/components/Navbar";
import { PlatformOverview } from "@/components/PlatformOverview";
import { ProcessOverview } from "@/components/ProcessOverview";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { Trust } from "@/components/Trust";

// General landing — serves both jobseeker and HR audiences. The audience
// fork ("สำหรับผู้หางาน" / "สำหรับองค์กร") lives directly in Hero's own CTAs,
// not a separate section, since it's a navigation decision (each button is
// a hard link off this page) rather than something to persuade someone
// into after a scroll. Everything below Hero is for visitors still
// deciding, not a gate blocking that fork.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <PlatformOverview />
      <ProcessOverview />
      <Trust />
      {/* Lightweight proof-of-concept, not the real job board — that's
          /job, which MatchShowcase hands off to via its own link. */}
      <MatchShowcase />
      <ClosingCta
        title="พร้อมเริ่มต้นแล้วหรือยัง?"
        primaryHref="/game"
        primaryLabel="เริ่มหางาน เล่นเกมเลย →"
        secondaryHref="/company"
        secondaryLabel="หา Candidate (HR)"
      />
      <Footer />
    </div>
  );
}
