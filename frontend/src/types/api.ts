/**
 * Shared API types matching the backend response shape.
 */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  database: "configured" | "not_configured";
  cloudinary: "configured" | "not_configured";
  uptimeSeconds: number;
  timestamp: string;
}
