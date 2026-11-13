/**
 * Indian mobile number handling on the client — mirrors the backend
 * strategy so contributors are recognized regardless of input format.
 */

const INDIAN_MOBILE_LOCAL = /^[6-9]\d{9}$/;

/**
 * Normalizes an Indian mobile number to E.164 (`+91XXXXXXXXXX`).
 * Accepts `98765 43210`, `09876543210`, `+919876543210` etc.
 * Returns null when the input is not a valid Indian mobile number.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  let local = digits;
  if (local.length === 12 && local.startsWith("91")) {
    local = local.slice(2);
  } else if (local.length === 11 && local.startsWith("0")) {
    local = local.slice(1);
  }

  if (!INDIAN_MOBILE_LOCAL.test(local)) return null;
  return `+91${local}`;
}

/** Pretty display format: +91 98765 43210. */
export function formatIndianMobile(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
