import { NextRequest, NextResponse } from "next/server";

import type { ReportSection } from "@/types/reports";

interface GenericBackendEnvelope {
  code?: number;
  message?: string;
  data?: Record<string, unknown>;
  error?: unknown;
}

function normalizeSection(payload: GenericBackendEnvelope): ReportSection | null {
  const data = payload.data ?? {};
  const candidates = [
    data.section,
    data.payload,
    data.data,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const section = candidate as ReportSection;

      if (section.section_key && section.content_items) {
        return section;
      }
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string; sectionKey: string }> },
) {
  const { reportId, sectionKey } = await context.params;
  const reportApiBase = process.env.REPORT_API_BASE_URL;

  const filter1 = request.nextUrl.searchParams.get("filter1") ?? "All";
  const filter2 = request.nextUrl.searchParams.get("filter2") ?? "All";

  const upstreamUrl = new URL(
    `/consultant/api/v1/reports/${reportId}/sections/${sectionKey}`,
    reportApiBase,
  );
  upstreamUrl.searchParams.set("filter1", filter1);
  upstreamUrl.searchParams.set("filter2", filter2);

  try {
    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          message: `Failed to fetch upstream section: ${sectionKey} (${response.status})`,
        },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as GenericBackendEnvelope;
    const section = normalizeSection(payload);

    if (!section) {
      return NextResponse.json(
        { message: `Invalid payload for section: ${sectionKey}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ section }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : `Failed to fetch section: ${sectionKey}`,
      },
      { status: 500 },
    );
  }
}
