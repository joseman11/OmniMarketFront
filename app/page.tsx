import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { FeatureCards } from "@/components/landing/feature-cards";
import { FinalCta, Footer } from "@/components/landing/final-cta";
import { FloatingOrders } from "@/components/landing/floating-orders";
import { Hero } from "@/components/landing/hero";
import { PillNav } from "@/components/landing/pill-nav";
import { TechMarquee } from "@/components/landing/tech-marquee";

export default function LandingPage() {
  return (
    <>
      <PillNav />
      <main className="bg-ink-2">
        <Hero />
        <TechMarquee />
        <DashboardPreview />
        <FeatureCards />
        <FloatingOrders />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
