/**
 * Shared button/link variant styles — imported by Button and LinkButton so
 * buttons and router links always match. (Separate module so component files
 * stay react-refresh friendly.)
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = ""
): string {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-maroon-600 text-cream-50 shadow-sm hover:bg-maroon-700 focus-visible:outline-maroon-600 disabled:bg-maroon-300",
    secondary:
      "bg-gold-500 text-maroon-900 shadow-sm hover:bg-gold-400 focus-visible:outline-gold-600 disabled:bg-gold-200",
    outline:
      "border border-maroon-600 bg-transparent text-maroon-700 hover:bg-maroon-600 hover:text-cream-50 focus-visible:outline-maroon-600 disabled:text-maroon-300",
    ghost: "text-maroon-700 hover:bg-cream-200 focus-visible:outline-gold-600",
  };

  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`;
}
