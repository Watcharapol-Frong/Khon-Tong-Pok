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
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <JobMatching />
      <Problem />
      <Solution />
      <PlatformOverview />
      <ProcessOverview />
      <ChooseYourJourney />
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
