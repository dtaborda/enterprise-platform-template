import type { Metadata } from "next";
import { CtaBanner } from "./_components/cta-banner";
import { FeaturesSection } from "./_components/features-section";
import { HeroSection } from "./_components/hero-section";
import { SocialProofSection } from "./_components/social-proof-section";

export const metadata: Metadata = {
  title: {
    absolute: "Enterprise Platform — Build Multi-Tenant SaaS Faster",
  },
  description:
    "The full-stack, multi-tenant SaaS template powered by Next.js, Supabase, and TypeScript. Ship faster with built-in auth, billing, teams, and more.",
  openGraph: {
    title: "Enterprise Platform — Build Multi-Tenant SaaS Faster",
    description:
      "The full-stack, multi-tenant SaaS template powered by Next.js, Supabase, and TypeScript.",
    type: "website",
    url: "/",
  },
};

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <SocialProofSection />
      <CtaBanner />
    </>
  );
}
