/**
 * Submission workflow types shared by pages and API modules.
 */
export type SubmissionType = "writeup" | "painting";
export type SubmissionLanguage = "english" | "hindi" | "odia";

export interface ContributorInput {
  name: string;
  phone: string;
  designation?: string;
}

export interface WriteupInput {
  editorJson: unknown;
  htmlContent: string;
}

export interface PaintingInput {
  imageUrl: string;
  imagekitFileId?: string;
  caption?: string;
}

export interface CreateSubmissionPayload {
  contributor: ContributorInput;
  title: string;
  language: SubmissionLanguage;
  submissionType: SubmissionType;
  writeup?: WriteupInput;
  painting?: PaintingInput;
}

export interface SubmissionCreated {
  id: string;
  referenceNumber: string;
  status: string;
  title: string;
  submissionType: SubmissionType;
  language: SubmissionLanguage;
  createdAt: string;
}

export interface UploadedImage {
  imageUrl: string;
  imagekitFileId: string;
  bytes: number;
  format: string;
}
