import type { ReportApiResponse, ReportDocument, ReportMenuKey } from "@/types/reports";

export async function fetchReport(reportKey: ReportMenuKey): Promise<ReportDocument> {
  const response = await fetch(`/api/reports/${reportKey}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${reportKey} (${response.status})`);
  }

  const payload = (await response.json()) as ReportApiResponse;
  return payload.report;
}