import { ClosingCta } from "@/components/ClosingCta";
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
// The sample Smart Profile/radar chart lives in Hero itself — an earlier
// pass pulled it out into its own section and replaced Hero's visual with
// an abstract flow diagram, which read as clutter competing with Hero's
// actual job (headline + CTAs). Reverted; Hero keeps the result card.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
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
