import { NextRequest, NextResponse } from "next/server";

const ANALYST_API_BASE_URL =
  process.env.ANALYST_API_BASE_URL ?? "https://atlas.asksquirrel.ai";

export async function GET(request: NextRequest) {
  const metric = request.nextUrl.searchParams.get("metric");
  const sheet = request.nextUrl.searchParams.get("sheet");
  const params = new URLSearchParams();

  if (metric) {
    params.set("metric", metric);
  }

  if (sheet) {
    params.set("sheet", sheet);
  }

  const url = `${ANALYST_API_BASE_URL}/analyst/api/v1/excel/metrics${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Upstream API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch data from analyst API" },
      { status: 500 },
    );
  }
}
