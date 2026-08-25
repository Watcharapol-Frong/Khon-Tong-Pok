import { ChooseYourJourney } from "@/components/ChooseYourJourney";
import { ClosingCta } from "@/components/ClosingCta";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { JobMatching } from "@/components/JobMatching";
import { Navbar } from "@/components/Navbar";
import { PlatformOverview } from "@/components/PlatformOverview";
import { ProcessOverview } from "@/components/ProcessOverview";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { Trust } from "@/components/Trust";

// General landing — serves both jobseeker and HR audiences, funneling each
// toward their own dedicated experience (/game, /company) via
// ChooseYourJourney rather than trying to fully pitch either one here.
//
// ChooseYourJourney is a navigation decision, not a conversion section —
// each card is a hard link away from this page, not a same-page filter —
// so it sits right after Hero, letting anyone who already knows why they're
// here leave immediately instead of scrolling through content aimed at the
// other audience first. Everything below it (JobMatching onward) is for
// visitors still deciding, not a gate someone has to pass through to reach
// the fork.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <ChooseYourJourney />
      <JobMatching />
      <Problem />
      <Solution />
      <PlatformOverview />
      <ProcessOverview />
      <Trust />
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
