import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { EaselArt, LotusDivider, QuillArt } from "../illustrations/artwork";
import { SectionHeading } from "../ui/SectionHeading";
import { LinkButton } from "../ui/LinkButton";

interface CardProps {
  illustration: ReactNode;
  title: string;
  companion: string;
  description: string;
  points: string[];
  cta: string;
  to: string;
}

function SubmissionCard({ illustration, title, companion, description, points, cta, to }: CardProps) {
  return (
    <article className="group flex flex-col rounded-xl border border-gold-300 bg-cream-50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      {/* gold-maroon accent bar */}
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-maroon-700 via-maroon-500 to-gold-500" aria-hidden="true" />

      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-cream-200 text-maroon-700 transition-colors group-hover:border-gold-500">
            {illustration}
          </span>
          <p className="text-odia pt-2 text-right text-lg text-leaf-600">{companion}</p>
        </div>

        <h3 className="mt-5 font-display text-2xl font-bold text-maroon-800">{title}</h3>
        <LotusDivider className="mt-1 w-28" />

        <p className="mt-3 text-sm leading-relaxed text-ink-700">{description}</p>

        <ul className="mt-4 space-y-1.5 text-sm text-ink-500">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-gold-200 pt-5">
          <LinkButton to={to} variant="outline" className="w-full group-hover:bg-maroon-600 group-hover:text-cream-50 sm:w-auto">
            {cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </LinkButton>
        </div>
      </div>
    </article>
  );
}

/**
 * Two prominent submission cards — Write Up and Painting — deep-linking into
 * the submission flow with the type preselected.
 */
export function SubmissionCards() {
  return (
    <section className="scroll-mt-28" id="contribute">
      <SectionHeading
        eyebrow="Call for contributions"
        title="Choose your tribute"
        companion="ଆପଣଙ୍କ ଅବଦାନ"
        description="The magazine accepts two kinds of contributions. Select one to begin — you can save a draft and return to it any time."
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8">
        <SubmissionCard
          illustration={<QuillArt className="h-14 w-14" />}
          title="Write Up"
          companion="ଲେଖା"
          description="Compose a memory, an essay or a poem in our built-in rich text editor — with headings, emphasis and lists."
          points={[
            "Write directly in the browser — no formatting to lose",
            "English, Hindi or Odia",
            "Save as draft, finish whenever you are ready",
          ]}
          cta="Write a tribute"
          to="/submit?type=writeup"
        />

        <SubmissionCard
          illustration={<EaselArt className="h-14 w-14" />}
          title="Painting"
          companion="ଚିତ୍ର"
          description="Share a painting or sketch from your studio. Photograph or scan it and upload the image with a caption."
          points={[
            "JPEG, PNG or WebP, up to 5 MB",
            "Stored safely with a permanent link",
            "Add a caption to tell its story",
          ]}
          cta="Upload a painting"
          to="/submit?type=painting"
        />
      </div>
    </section>
  );
}
