import type { MetricsResponse } from "@/types/metrics";

interface FetchMetricsOptions {
  metric?: string;
  sheet?: string;
}

export async function fetchMetrics(options: FetchMetricsOptions = {}): Promise<MetricsResponse> {
  const { metric, sheet } = options;
  const params = new URLSearchParams();

  if (metric) {
    params.set("metric", metric);
  }

  if (sheet) {
    params.set("sheet", sheet);
  }

  const url = `/api/metrics${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.status}`);
  }

  return (await response.json()) as MetricsResponse;
}
