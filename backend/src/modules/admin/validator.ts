import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const adminStatusSchema = z.object({
  status: z.enum(["draft", "submitted", "under_review", "approved", "rejected"]),
  remarks: z.string().max(1000).optional(),
});

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["draft", "submitted", "under_review", "approved", "rejected"]).optional(),
  submissionType: z.enum(["writeup", "painting"]).optional(),
  search: z.string().max(200).optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminStatusInput = z.infer<typeof adminStatusSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
