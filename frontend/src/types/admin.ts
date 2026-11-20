/** Admin dashboard types (server-driven, always paginated). */

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
}

export type AdminStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export type AdminSubmissionType = "writeup" | "painting";
export type AdminLanguage = "english" | "hindi" | "odia";

export interface DashboardStats {
  totalContributors: number;
  totalSubmissions: number;
  totalDrafts: number;
  totalFinalSubmissions: number;
  pendingReviews: number;
  byStatus: Record<AdminStatus, number>;
  byType: Record<AdminSubmissionType, number>;
  recent: Array<{
    id: string;
    referenceNumber: string;
    title: string;
    status: AdminStatus;
    submissionType: AdminSubmissionType;
    createdAt: string;
    contributorName: string;
  }>;
}

export interface AdminSubmissionItem {
  id: string;
  referenceNumber: string;
  title: string;
  submissionType: AdminSubmissionType;
  language: AdminLanguage;
  status: AdminStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  contributorName: string;
  contributorPhone: string;
  contributorDesignation: string | null;
}

export interface AdminListResponse {
  items: AdminSubmissionItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminListParams {
  page: number;
  limit: number;
  status?: AdminStatus;
  submissionType?: AdminSubmissionType;
  language?: AdminLanguage;
  search?: string;
  contributorName?: string;
  phone?: string;
  designation?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AdminImage {
  id: string;
  imageUrl: string;
  imagekitFileId: string | null;
  caption: string | null;
  displayOrder: number;
  createdAt: string;
}

export interface AdminHistoryEntry {
  id: string;
  action: string;
  remarks: string | null;
  changedBy: string;
  createdAt: string;
}

export interface AdminSubmissionDetail {
  id: string;
  referenceNumber: string;
  submissionType: AdminSubmissionType;
  title: string;
  subtitle: string | null;
  category: string | null;
  description: string | null;
  language: AdminLanguage;
  status: AdminStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  contributor: {
    id: string;
    name: string;
    phone: string;
    designation: string | null;
  };
  writeup: { editorJson: unknown; htmlContent: string; updatedAt: string } | null;
  images: AdminImage[] | null;
  history: AdminHistoryEntry[];
}

export interface AdminStatusPayload {
  status: AdminStatus;
  remarks?: string;
}
