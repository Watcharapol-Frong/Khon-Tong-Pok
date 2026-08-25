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
// Content-pruning pass: every section used to carry equal visual weight
// (text + card + long explanation each), which read as a brochure rather
// than a page with rhythm. PlatformOverview was cut entirely — it answered
// the same "how does this work" question as ProcessOverview, just longer.
// Trust moved to just before the CTA, as reinforcement rather than another
// feature set to read through.
//
// ExampleResult sits after ProcessOverview, not in Hero — showing a result
// card before explaining what the platform even is read like opening on a
// report before anyone knew what they were looking at. "What does the
// output look like" only becomes the relevant question once someone
// understands assess -> understand -> match.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <ProcessOverview />
      <ExampleResult />
      {/* Lightweight proof-of-concept, not the real job board — that's
          /job. Nobody here is choosing a job yet. */}
      <MatchShowcase />
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
