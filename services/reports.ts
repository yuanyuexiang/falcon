import type { ReportApiResponse, ReportDocument } from "@/types/reports";

export async function fetchReport(reportId: string): Promise<ReportDocument> {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${reportId} (${response.status})`);
  }

  const payload = (await response.json()) as ReportApiResponse;
  return payload.report;
}