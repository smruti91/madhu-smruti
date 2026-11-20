import { z } from "zod";
import { env } from "../../config/env";
import { indianMobileSchema } from "../contributors/validator";

const writeupSchema = z.object({
  // Tiptap ProseMirror document (JSONB)
  editorJson: z.unknown(),
  htmlContent: z.string().min(1, "Writeup content is required"),
});

/** Token entered on the Track / Edit Article screen (cross-device access). */
export const verifyDraftTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Enter your draft access token")
    .max(255, "This token is too long"),
});

const paintingImageSchema = z.object({
  // Must come from the upload endpoints (ImageKit) - never raw binary in JSON
  imageUrl: z.string().url("A valid image URL is required"),
  imagekitFileId: z.string().max(255).optional(),
  caption: z.string().max(300).optional(),
});

const paintingSchema = z
  .object({
    // Painting images in display order. Max size/count come from env config.
    images: z
      .array(paintingImageSchema)
      .min(1, "At least one painting image is required")
      .max(
        env.MAX_PAINTING_IMAGES,
        `At most ${env.MAX_PAINTING_IMAGES} images are allowed per painting`
      ),
  })
  .superRefine((body, ctx) => {
    const urls = body.images.map((image) => image.imageUrl);
    if (new Set(urls).size !== urls.length) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "Duplicate images are not allowed - remove the repeated image",
      });
    }
  });

export const createSubmissionSchema = z
  .object({
    contributorId: z.string().uuid("A registered contributorId is required"),
    title: z.string().trim().min(1, "Title is required").max(200),
    subtitle: z.string().trim().max(200).optional(),
    category: z.string().trim().max(80).optional(),
    description: z.string().trim().max(2000).optional(),
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
        message: "At least one uploaded painting image is required for a painting submission",
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
    title: z.string().trim().min(1).max(200).optional(),
    subtitle: z.string().trim().max(200).optional(),
    category: z.string().trim().max(80).optional(),
    description: z.string().trim().max(2000).optional(),
    language: z.enum(["english", "hindi", "odia"]).optional(),
    // True when the request comes from the editor's debounced autosave -
    // skips the audit-history entry (autosave is not a meaningful event).
    autosave: z.boolean().optional(),
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
      body.subtitle !== undefined ||
      body.category !== undefined ||
      body.description !== undefined ||
      body.language !== undefined ||
      body.writeup !== undefined ||
      body.painting !== undefined ||
      body.contributor !== undefined,
    { message: "At least one field must be provided to update" }
  );

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type VerifyDraftTokenInput = z.infer<typeof verifyDraftTokenSchema>;
