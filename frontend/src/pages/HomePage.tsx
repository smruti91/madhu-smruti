import { Hero } from "../components/landing/Hero";
import { About } from "../components/landing/About";
import { SubmissionCards } from "../components/landing/SubmissionCards";
import { ProcessSection } from "../components/landing/ProcessSection";
import { CtaBand } from "../components/landing/CtaBand";

/**
 * Public landing page for the MADHU SMRUTI literary magazine.
 */
export function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-20">
      <Hero />
      <About />
      <SubmissionCards />
      <ProcessSection />
      <CtaBand />
    </div>
  );
}
