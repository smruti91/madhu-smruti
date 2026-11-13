import type { Request, Response } from "express";
import { registerContributor } from "./service";
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
      id: contributor.id,
      name: contributor.name,
      phone: contributor.phone,
      designation: contributor.designation,
    },
    created ? "Contributor registered successfully" : "Contributor already registered - details updated",
    created ? 201 : 200
  );
}
