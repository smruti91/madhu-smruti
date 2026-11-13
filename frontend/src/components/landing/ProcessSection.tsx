import { CloudUpload, FileKey2, PenLine, SendHorizontal } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";

const steps = [
  {
    icon: PenLine,
    title: "Register your details",
    text: "Leave your name and phone number once — returning contributors are recognised automatically.",
  },
  {
    icon: CloudUpload,
    title: "Create your draft",
    text: "Write in the editor or upload your painting. Everything is saved as a draft first.",
  },
  {
    icon: FileKey2,
    title: "Keep your edit token",
    text: "You receive a reference number and a private edit token. The token is your only key to view or edit later — store it safely.",
  },
  {
    icon: SendHorizontal,
    title: "Finalize for review",
    text: "When your piece is ready, finalize it. Our editors will review it for publication in the magazine.",
  },
];

/**
 * How it works — the four-step submission process.
 */
export function ProcessSection() {
  return (
    <section id="process" className="scroll-mt-28">
      <SectionHeading
        eyebrow="How it works"
        title="The submission journey"
        companion="ଦାଖଲ ପ୍ରକ୍ରିୟା"
        description="From first line to final page — four simple steps."
      />

      <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {/* connecting rule (desktop) */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-7 hidden border-t border-dashed border-gold-400 lg:block"
          aria-hidden="true"
        />
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="relative">
            <div className="flex items-center gap-4 sm:flex-col sm:items-start lg:items-center lg:text-center">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold-400 bg-cream-50 text-maroon-700 shadow-sm">
                <Icon className="h-6 w-6" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-maroon-600 font-display text-xs font-bold text-cream-50">
                  {index + 1}
                </span>
              </span>
              <div className="sm:mt-4">
                <h3 className="font-display text-lg font-bold text-maroon-800">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{text}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
