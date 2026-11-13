import { Link } from "react-router-dom";
import { Feather, PenLine } from "lucide-react";
import { APP_NAME, APP_NAME_ODIA, ORGANIZATION } from "../../config/constants";
import { ArchWatermark, LotusDivider } from "../illustrations/artwork";
import { LinkButton } from "../ui/LinkButton";

/**
 * Hero — masthead-style opening with arch watermark and dual CTAs.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border border-gold-300 bg-cream-50 shadow-[0_1px_0_0_#ddc384]">
      {/* double-rule editorial frame */}
      <div className="pointer-events-none absolute inset-2 border border-maroon-100" aria-hidden="true" />
      {/* arch watermark */}
      <ArchWatermark className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-64 w-full max-w-2xl text-gold-400 opacity-25 sm:h-80" />

      <div className="relative px-6 pb-16 pt-14 text-center sm:px-12 sm:pb-20 sm:pt-20">
        <p className="flex items-center justify-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-leaf-600 sm:text-xs">
          <Feather className="h-4 w-4 text-gold-500" aria-hidden="true" />
          An {ORGANIZATION} memorial publication
          <Feather className="h-4 w-4 text-gold-500" aria-hidden="true" />
        </p>

        <h1 className="mt-5 font-display text-5xl font-black leading-tight tracking-wide text-maroon-800 sm:text-7xl">
          {APP_NAME}
        </h1>
        <p className="text-odia mt-3 text-3xl font-semibold text-gold-600 sm:text-4xl">
          {APP_NAME_ODIA}
        </p>

        <LotusDivider className="mx-auto mt-6" />

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-700 sm:text-lg">
          Stories, verses and paintings gathered in loving memory of Madhu —
          a living keepsake written by the people whose lives he touched.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <LinkButton to="/submit" variant="primary" className="w-full px-6 py-3 text-base sm:w-auto">
            <PenLine className="h-5 w-5" aria-hidden="true" />
            Share your contribution
          </LinkButton>
          <Link
            to="/#about"
            className="w-full rounded-lg px-6 py-3 text-sm font-medium text-maroon-700 underline decoration-gold-400 decoration-2 underline-offset-4 transition-colors hover:bg-cream-200 sm:w-auto"
          >
            About the magazine
          </Link>
        </div>
      </div>
    </section>
  );
}
