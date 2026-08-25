import { ClosingCta } from "@/components/ClosingCta";
import { ExampleResult } from "@/components/ExampleResult";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { MatchShowcase } from "@/components/MatchShowcase";
import { Navbar } from "@/components/Navbar";
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
//
// Product-storytelling pass: leads with the actual transformation
// (Resume -> Behavioral Data -> AI Profile -> Match, shown as chips right
// in Hero) and Smart Profile Demo + Match Recommendation come right after
// Solution — proof of the concept before the mechanism gets explained in
// ProcessOverview, since a result someone can see matters more here than
// an explanation of how it was produced. Trust stays last before the CTA,
// as reinforcement rather than another feature set to read through.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <ExampleResult />
      {/* Lightweight proof-of-concept, not the real job board — that's
          /job. Nobody here is choosing a job yet. */}
      <MatchShowcase />
      <ProcessOverview />
      <Trust />
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
