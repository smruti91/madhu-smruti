import { z } from "zod";
import { indianMobileSchema } from "../contributors/validator";

const writeupSchema = z.object({
  // Tiptap ProseMirror document (JSONB)
  editorJson: z.unknown(),
  htmlContent: z.string().min(1, "Writeup content is required"),
});

const paintingSchema = z.object({
  // Must come from the upload endpoints (ImageKit) - never raw binary in JSON
  imageUrl: z.string().url("A valid image URL is required"),
  imagekitFileId: z.string().max(255).optional(),
  caption: z.string().max(300).optional(),
});

export const createSubmissionSchema = z
  .object({
    contributorId: z.string().uuid("A registered contributorId is required"),
    title: z.string().min(1, "Title is required").max(200),
    language: z.enum(["english", "hindi", "odia"]),
    submissionType: z.enum(["writeup", "painting"]),
    writeup: writeupSchema.optional(),
    painting: paintingSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.submissionType === "writeup" && !body.writeup) {
      ctx.addIssue({
        code: "custom",
        path: ["writeup"],
        message: "Writeup content is required for a writeup submission",
      });
    }
    if (body.submissionType === "painting" && !body.painting) {
      ctx.addIssue({
        code: "custom",
        path: ["painting"],
        message: "An uploaded painting image is required for a painting submission",
      });
    }
    if (body.submissionType === "writeup" && body.painting) {
      ctx.addIssue({
        code: "custom",
        path: ["painting"],
        message: "Painting data is not allowed on a writeup submission",
      });
    }
    if (body.submissionType === "painting" && body.writeup) {
      ctx.addIssue({
        code: "custom",
        path: ["writeup"],
        message: "Writeup content is not allowed on a painting submission",
      });
    }
  });

export const updateSubmissionSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    language: z.enum(["english", "hindi", "odia"]).optional(),
    writeup: writeupSchema.optional(),
    painting: paintingSchema.optional(),
    contributor: z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        phone: indianMobileSchema.optional(),
        designation: z.string().trim().max(120).optional(),
      })
      .optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.language !== undefined ||
      body.writeup !== undefined ||
      body.painting !== undefined ||
      body.contributor !== undefined,
    { message: "At least one field must be provided to update" }
  );

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
