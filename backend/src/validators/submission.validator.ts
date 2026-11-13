import { z } from "zod";

/**
 * Validation schemas for the submission workflow.
 */

export const contributorInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z
    .string()
    .min(5, "Phone number is too short")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone number contains invalid characters"),
  designation: z.string().max(120).optional(),
});

export const writeupInputSchema = z.object({
  // Tiptap ProseMirror document (JSONB) - structure is produced by Tiptap
  editorJson: z.unknown(),
  htmlContent: z.string().min(1, "Writeup content is required"),
});

export const paintingInputSchema = z.object({
  // Must come from the upload endpoint (ImageKit) - never raw binary in JSON
  imageUrl: z.string().url("A valid image URL is required"),
  imagekitFileId: z.string().max(255).optional(),
  caption: z.string().max(300).optional(),
});

export const createSubmissionSchema = z
  .object({
    body: z.object({
      contributor: contributorInputSchema,
      title: z.string().min(1, "Title is required").max(200),
      language: z.enum(["english", "hindi", "odia"]),
      submissionType: z.enum(["writeup", "painting"]),
      writeup: writeupInputSchema.optional(),
      painting: paintingInputSchema.optional(),
    }),
  })
  .superRefine((payload, ctx) => {
    const { submissionType, writeup, painting } = payload.body;

    if (submissionType === "writeup" && !writeup) {
      ctx.addIssue({
        code: "custom",
        path: ["body", "writeup"],
        message: "Writeup content is required for a writeup submission",
      });
    }

    if (submissionType === "painting" && !painting) {
      ctx.addIssue({
        code: "custom",
        path: ["body", "painting"],
        message: "An uploaded painting image is required for a painting submission",
      });
    }

    if (submissionType === "writeup" && painting) {
      ctx.addIssue({
        code: "custom",
        path: ["body", "painting"],
        message: "Painting data is not allowed on a writeup submission",
      });
    }

    if (submissionType === "painting" && writeup) {
      ctx.addIssue({
        code: "custom",
        path: ["body", "writeup"],
        message: "Writeup content is not allowed on a painting submission",
      });
    }
  });
