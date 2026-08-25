import { ClosingCta } from "@/components/ClosingCta";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { JobMatching } from "@/components/JobMatching";
import { Navbar } from "@/components/Navbar";
import { StrategyPanel } from "@/components/StrategyPanel";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <Hero />
      <JobMatching />
      <HowItWorks />
      <StrategyPanel />
      <Faq />
      {/* By this point the visitor has already scrolled past HowItWorks and
          StrategyPanel — routing to /game here would mean re-showing that
          exact same pitch a second time before reaching the same /login
          link /game's own Hero already points to. Skip straight there
          instead; Hero's CTA up top still goes to /game since a visitor who
          clicks that hasn't seen any of the pitch yet and needs it. */}
      <ClosingCta primaryHref="/login" />
      <Footer />
    </div>
  );
}
