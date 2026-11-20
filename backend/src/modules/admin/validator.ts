import { z } from "zod";

const statuses = ["draft", "submitted", "under_review", "approved", "rejected"] as const;
const types = ["writeup", "painting"] as const;
const languages = ["english", "hindi", "odia"] as const;
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for dates");

export const adminLoginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const adminStatusSchema = z.object({
  status: z.enum(statuses),
  remarks: z.string().max(1000).optional(),
});

/**
 * Admin list query. Pagination is always server-side; the dashboard only
 * ever holds one page of results in the browser.
 */
export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(statuses).optional(),
  submissionType: z.enum(types).optional(),
  search: z.string().max(200).optional(),
  // Fine-grained filters requested by the editorial dashboard.
  contributorName: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  designation: z.string().max(120).optional(),
  language: z.enum(languages).optional(),
  fromDate: dateString.optional(),
  toDate: dateString.optional(),
});

/** Export accepts the same filters but ignores pagination. */
export const adminExportQuerySchema = adminListQuerySchema.omit({
  page: true,
  limit: true,
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminStatusInput = z.infer<typeof adminStatusSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminExportQuery = z.infer<typeof adminExportQuerySchema>;
