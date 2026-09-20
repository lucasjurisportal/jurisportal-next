import { CtaSection } from "@/components/public-site/CtaSection";
import { FaqSection } from "@/components/public-site/FaqSection";
import { Footer } from "@/components/public-site/Footer";
import { DemonstrationSection } from "@/components/public-site/DemonstrationSection";
import { Header } from "@/components/public-site/Header";
import { Hero } from "@/components/public-site/Hero";
import { HumanSection } from "@/components/public-site/HumanSection";
import { PricingSection } from "@/components/public-site/PricingSection";
import { ProblemSection } from "@/components/public-site/ProblemSection";
import { SecuritySection } from "@/components/public-site/SecuritySection";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <HumanSection />
        <DemonstrationSection />
        <SecuritySection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
