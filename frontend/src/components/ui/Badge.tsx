import type { ReactNode } from "react";

type Tone = "green" | "red" | "amber" | "slate";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-700",
};

/**
 * Small status badge.
 */
export function Badge({ tone = "slate", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
