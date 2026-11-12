interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

/**
 * Reusable loading spinner.
 */
export function Spinner({ size = "md", label }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <span
        className={`animate-spin rounded-full border-slate-300 border-t-sky-600 ${sizeClasses[size]}`}
      />
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
    </span>
  );
}
