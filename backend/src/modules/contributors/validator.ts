import { z } from "zod";

export const createContributorSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z
    .string()
    .min(5, "Phone number is too short")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters"),
  designation: z.string().max(120).optional(),
});

export type CreateContributorInput = z.infer<typeof createContributorSchema>;
