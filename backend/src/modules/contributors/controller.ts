import type { Request, Response } from "express";
import { contributorPublicFields, registerContributor } from "./service";
import { sendSuccess } from "../../utils/apiResponse";

/**
 * POST /api/contributors
 * Registers contributor details (upsert on phone number).
 */
export async function createContributorHandler(req: Request, res: Response): Promise<void> {
  const { contributor, created } = await registerContributor(req.body);

  sendSuccess(
    res,
    {
      ...contributorPublicFields(contributor),
    },
    created ? "Contributor registered successfully" : "Contributor already registered - details updated",
    created ? 201 : 200
  );
}
