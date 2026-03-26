import { NextResponse } from "next/server";

import type { BackendReportEnvelope, ReportListItem } from "@/types/reports";

const DEFAULT_REPORT_API_BASE = "http://localhost:8000";

function normalizeReportList(payload: BackendReportEnvelope): ReportListItem[] {
  const data = payload.data as Record<string, unknown> | undefined;

  const candidates = [
    data?.payload,
    data?.reports,
    data?.items,
    data?.list,
    payload.data,
  ];

  const rawList = candidates.find((item) => Array.isArray(item));

  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => {
      const id = String(item.id ?? item.report_id ?? item.report_key ?? `report-${index}`);
      const reportKey = String(item.report_key ?? item.id ?? "");
      const name = String(item.name ?? reportKey ?? id);
      const type = String(item.type ?? "unknown");
      const status = String(item.status ?? "unknown");

      return {
        ...item,
        id,
        report_key: reportKey,
        name,
        type,
        status,
      };
    })
    .filter((item) => item.report_key.length > 0);
}

export async function GET() {
  const reportApiBase = process.env.REPORT_API_BASE_URL ?? DEFAULT_REPORT_API_BASE;
  const backendUrl = `${reportApiBase}/consultant/api/v1/reports`;

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch upstream report list (${response.status})` },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as BackendReportEnvelope;
    const reports = normalizeReportList(payload);

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to fetch report list",
      },
      { status: 500 },
    );
  }
}
