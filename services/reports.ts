import type {
  ReportApiResponse,
  ReportDocument,
  ReportListApiResponse,
  ReportListItem,
  ReportSection,
  SectionDetailApiResponse,
  SectionFilterParams,
} from "@/types/reports";

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

export async function fetchReports(): Promise<ReportListItem[]> {
  const response = await fetch("/api/reports", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch reports (${response.status})`);
  }

  const payload = (await response.json()) as ReportListApiResponse;
  return Array.isArray(payload.reports) ? payload.reports : [];
}

export async function getSectionDetail(
  reportKey: string,
  sectionKey: string,
  filters: SectionFilterParams,
): Promise<ReportSection> {
  const params = new URLSearchParams();
  params.set("filter1", filters.filter1 ?? "All");
  params.set("filter2", filters.filter2 ?? "All");
  const url = `/api/reports/${reportKey}/sections/${sectionKey}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch section detail: ${sectionKey} (${response.status})`);
  }

  const payload = (await response.json()) as SectionDetailApiResponse;
  return payload.section;
}