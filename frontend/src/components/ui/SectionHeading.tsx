import type { ReactNode } from "react";
import { LotusDivider } from "../illustrations/artwork";

interface SectionHeadingProps {
  /** Small gold eyebrow line above the title, e.g. "FROM THE DESK". */
  eyebrow?: string;
  title: ReactNode;
  /** Odia or Hindi companion title. */
  companion?: string;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

/**
 * Editorial section heading: eyebrow, display title, ornamental divider.
 */
export function SectionHeading({
  eyebrow,
  title,
  companion,
  description,
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={`${centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 font-display text-3xl font-bold text-maroon-800 sm:text-4xl">
        {title}
      </h2>
      {companion ? (
        <p className="text-odia mt-1 text-xl text-leaf-600">{companion}</p>
      ) : null}
      <LotusDivider className={centered ? "mx-auto" : ""} />
      {description ? (
        <p className="text-base leading-relaxed text-ink-700">{description}</p>
      ) : null}
    </div>
  );
}
