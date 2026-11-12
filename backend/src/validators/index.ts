/**
 * Zod validation schemas, one file per feature module (e.g. memory.validator.ts).
 *
 * Schemas are used with the generic `validate` middleware from
 * `middleware/validate.ts`, shaped as `{ body, query, params }`:
 *
 * import { z } from "zod";
 *
 * export const createMemorySchema = z.object({
 *   body: z.object({
 *     title: z.string().min(1),
 *     html: z.string(),
 *   }),
 * });
 *
 * Business functionality is not implemented yet, so this module is a placeholder.
 */
export {};
