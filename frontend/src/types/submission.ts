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

export interface ContributorRegistered {
  id: string;
  name: string;
  phone: string;
  designation?: string | null;
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
  contributorId: string;
  title: string;
  subtitle?: string;
  category?: string;
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
  subtitle?: string | null;
  category?: string | null;
  submissionType: SubmissionType;
  language: SubmissionLanguage;
  createdAt: string;
  contributor: ContributorRegistered;
  /** Raw private edit token - shown once, never stored on the server. */
  editToken: string;
}

export interface UploadedImage {
  imageUrl: string;
  imagekitFileId: string;
  bytes: number;
  format: string;
}

export interface WriteupContent {
  editorJson: unknown;
  htmlContent: string;
  updatedAt: string;
}

export interface PaintingImage {
  id: string;
  imageUrl: string;
  caption: string | null;
  displayOrder: number;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  action: string;
  remarks: string | null;
  changedBy: string;
  createdAt: string;
}

/** Full private detail returned by GET /submissions/:id (token required). */
export interface SubmissionDetail {
  id: string;
  referenceNumber: string;
  submissionType: SubmissionType;
  title: string;
  subtitle: string | null;
  category: string | null;
  language: SubmissionLanguage;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  contributor: ContributorRegistered;
  writeup: WriteupContent | null;
  images: PaintingImage[] | null;
  history: HistoryEntry[];
}

/** Update payload for PUT /submissions/:id. */
export interface UpdateSubmissionPayload {
  title?: string;
  subtitle?: string;
  category?: string;
  language?: SubmissionLanguage;
  /** True when sent by the debounced autosave (skips the audit history). */
  autosave?: boolean;
  writeup?: WriteupInput;
  painting?: PaintingInput;
  contributor?: Partial<ContributorInput>;
}
