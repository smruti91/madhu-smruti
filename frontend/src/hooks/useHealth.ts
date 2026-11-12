import { useEffect, useState } from "react";
import { fetchHealthStatus } from "../api/health";
import type { HealthStatus } from "../types/api";

interface UseHealthResult {
  data: HealthStatus | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches backend health status for display on dashboards.
 */
export function useHealth(): UseHealthResult {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchHealthStatus()
      .then((status) => {
        if (!cancelled) setData(status);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
