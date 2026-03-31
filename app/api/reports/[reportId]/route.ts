import { NextRequest, NextResponse } from "next/server";

import type { BackendReportEnvelope, ReportDocument } from "@/types/reports";

const DEFAULT_REPORT_API_BASE = "http://consultant:8000";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const reportApiBase = process.env.REPORT_API_BASE_URL ?? DEFAULT_REPORT_API_BASE;
  const backendUrl = `${reportApiBase}/consultant/api/v1/reports/${reportId}`;

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
        { message: `Failed to fetch upstream report: ${reportId} (${response.status})` },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as BackendReportEnvelope;
    const report = payload.data?.payload as ReportDocument | undefined;

    if (!report) {
      return NextResponse.json({ message: `Invalid payload for report: ${reportId}` }, { status: 502 });
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : `Failed to fetch report: ${reportId}`,
      },
      { status: 500 },
    );
  }
}