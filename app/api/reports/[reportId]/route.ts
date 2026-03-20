import { NextRequest, NextResponse } from "next/server";

import analyticsReport from "@/data/echarts/rpt_analytics.echarts.json";
import financialReport from "@/data/echarts/rpt_financial.echarts.json";
import platformReport from "@/data/echarts/rpt_platform.echarts.json";
import type { ReportDocument } from "@/types/reports";

const REPORTS: Record<string, ReportDocument> = {
  "platform-overview": platformReport as ReportDocument,
  "data-analytics": analyticsReport as ReportDocument,
  "pricing-scenario": financialReport as ReportDocument,
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const report = REPORTS[reportId];

  if (!report) {
    return NextResponse.json({ message: `Unknown report: ${reportId}` }, { status: 404 });
  }

  return NextResponse.json({ report }, { status: 200 });
}