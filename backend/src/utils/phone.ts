/**
 * Indian mobile number normalization and validation.
 *
 * Strategy: accept common user inputs — `98765 43210`, `09876543210`,
 * `+919876543210`, `91-98765-43210` — and normalize to E.164
 * (`+919876543210`) before storage. Contributors are upserted on the
 * normalized value, so the same person is always recognized regardless
 * of formatting.
 */

/** NDNational number: 10 digits starting 6-9. */
const INDIAN_MOBILE_LOCAL = /^[6-9]\d{9}$/;

/**
 * Normalizes an Indian mobile number to E.164, or returns null when the
 * input cannot be interpreted as one.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  let local = digits;
  if (local.length === 12 && local.startsWith("91")) {
    local = local.slice(2); // +91XXXXXXXXXX
  } else if (local.length === 11 && local.startsWith("0")) {
    local = local.slice(1); // trunk prefix 0XXXXXXXXXX
  }

  if (!INDIAN_MOBILE_LOCAL.test(local)) return null;
  return `+91${local}`;
}

/** Pretty display format: +91 98765 43210. */
export function formatIndianMobile(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
