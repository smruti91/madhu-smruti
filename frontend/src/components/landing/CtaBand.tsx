import { PenLine } from "lucide-react";
import { LotusDivider } from "../illustrations/artwork";
import { LinkButton } from "../ui/LinkButton";

/**
 * Closing call-to-action band in deep maroon with gold accents.
 */
export function CtaBand() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-maroon-800 px-6 py-14 text-center shadow-md sm:px-12">
      {/* subtle gold frame */}
      <div className="pointer-events-none absolute inset-3 border border-gold-600/40" aria-hidden="true" />

      <div className="relative">
        <LotusDivider className="mx-auto text-gold-400" />
        <h2 className="mt-4 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
          Have a story to tell?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-cream-200">
          Every remembered anecdote, every verse and every sketch becomes a page of
          MADHU SMRUTI. Begin your contribution today — it takes only a few minutes.
        </p>
        <p className="text-odia mt-3 text-lg text-gold-300">ଆପଣଙ୍କ ସ୍ମୃତି, ଆମର ଐତିହ୍ୟ</p>
        <LinkButton
          to="/submit"
          variant="secondary"
          className="mt-8 px-8 py-3 text-base shadow-md hover:shadow-lg"
        >
          <PenLine className="h-5 w-5" aria-hidden="true" />
          Submit to the magazine
        </LinkButton>
      </div>
    </section>
  );
}
