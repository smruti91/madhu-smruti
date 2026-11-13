import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { buttonClasses, type ButtonVariant } from "./buttonStyles";

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  variant?: ButtonVariant;
  children: ReactNode;
}

/**
 * React Router link styled identically to Button — for CTAs that navigate.
 */
export function LinkButton({
  to,
  variant = "primary",
  className = "",
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link to={to} className={buttonClasses(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
