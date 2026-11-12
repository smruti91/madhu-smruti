import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Reusable labeled text input with error display.
 */
export function Input({ label, error, id, ...rest }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-2 focus:outline-offset-1 ${
          error
            ? "border-red-400 focus:outline-red-400"
            : "border-slate-300 focus:outline-sky-500"
        }`}
        {...rest}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
