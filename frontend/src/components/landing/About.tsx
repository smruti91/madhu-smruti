import { BookOpen, Feather, Languages, Palette } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";

const highlights = [
  {
    icon: BookOpen,
    title: "Stories & reminiscences",
    text: "Personal memories, essays and reflections that keep his voice alive.",
  },
  {
    icon: Feather,
    title: "Poems & verses",
    text: "Tributes and elegies in every tongue his readers loved.",
  },
  {
    icon: Palette,
    title: "Paintings & sketches",
    text: "Colours, lines and landscapes offered in his remembrance.",
  },
];

/**
 * About — short introduction to the magazine with editorial highlights.
 */
export function About() {
  return (
    <section id="about" className="scroll-mt-28">
      <SectionHeading
        eyebrow="About the magazine"
        title="A memorial in ink and colour"
        companion="ସ୍ମୃତିର ପୃଷ୍ଠା"
        description="MADHU SMRUTI is the annual memorial magazine of MDRAFM — a collection of write-ups and paintings contributed by members, friends and admirers, preserved as a tribute to a life that shaped us all."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {highlights.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-lg border border-gold-200 bg-cream-50 p-6 text-center transition-shadow hover:shadow-md"
          >
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold-300 bg-gold-100 text-maroon-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-maroon-800">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 flex items-start gap-4 rounded-lg border border-leaf-200 bg-leaf-100 p-5 sm:items-center">
        <Languages className="mt-1 h-6 w-6 shrink-0 text-leaf-600 sm:mt-0" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-leaf-700">
          Contributions are welcome in{" "}
          <strong className="font-semibold">English</strong>,{" "}
          <strong className="font-semibold">Hindi</strong> (हिन्दी) and{" "}
          <strong className="font-semibold">Odia</strong> (ଓଡ଼ିଆ) — write in whichever
          language feels closest to your memories.
        </p>
      </div>
    </section>
  );
}
