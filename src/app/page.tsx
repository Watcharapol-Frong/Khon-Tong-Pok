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
      <ClosingCta />
      <Footer />
    </div>
  );
}
