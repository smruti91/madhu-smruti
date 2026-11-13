import { z } from "zod";
import { normalizeIndianMobile } from "../../utils/phone";

/**
 * Mobile numbers are normalized to E.164 (+91XXXXXXXXXX) before storage so
 * contributor reuse works regardless of input formatting.
 */
export const indianMobileSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeIndianMobile(value);
  if (!normalized) {
    ctx.addIssue({
      code: "custom",
      message:
        "Enter a valid Indian mobile number, e.g. 98765 43210 or +91 98765 43210",
    });
    return z.NEVER;
  }
  return normalized;
});

export const createContributorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  phone: indianMobileSchema,
  designation: z
    .string()
    .trim()
    .max(120, "Designation must be 120 characters or fewer")
    .optional(),
});

export type CreateContributorInput = z.infer<typeof createContributorSchema>;
