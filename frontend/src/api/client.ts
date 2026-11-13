import axios, { AxiosError, type AxiosInstance } from "axios";
import { API_BASE_URL } from "../config/constants";
import type { ApiResponse } from "../types/api";

/**
 * Preconfigured Axios instance for all API communication.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // required for the HTTP-only admin session cookie
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - hook for auth headers when authentication is added
apiClient.interceptors.request.use((config) => {
  // const token = ...; // e.g. read from storage once auth is implemented
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - unwrap data / normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message =
      error.response?.data && "message" in error.response.data
        ? String(error.response.data.message)
        : error.message || "An unexpected error occurred";

    return Promise.reject(new Error(message));
  }
);
