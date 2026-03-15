import type { MetricPoint } from "@/types/metrics";

export interface ChartData {
  dates: string[];
  values: number[];
}

export interface StackedSeries {
  name: string;
  data: Array<number | null>;
}

export interface StackedChartData {
  dates: string[];
  series: StackedSeries[];
}

function toMonthEnd(dateText: string): Date {
  const date = new Date(dateText);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthlyRange(minDateText: string, maxDateText: string): string[] {
  const minDate = toMonthEnd(minDateText);
  const maxDate = toMonthEnd(maxDateText);

  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endCursor = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const dates: string[] = [];

  while (cursor <= endCursor) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    dates.push(formatDate(monthEnd));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return dates;
}

export function transformMetricToChartData(points: MetricPoint[]): ChartData {
  const sorted = [...points].sort((a, b) => {
    return new Date(a.vintage_month).getTime() - new Date(b.vintage_month).getTime();
  });

  return {
    dates: sorted.map((point) => point.vintage_month),
    values: sorted.map((point) => point.Value),
  };
}

export function transformSheetsToStackedChartData(
  sheetPointsMap: Record<string, MetricPoint[]>,
): StackedChartData {
  const sheetEntries = Object.entries(sheetPointsMap);

  if (sheetEntries.length === 0) {
    return { dates: [], series: [] };
  }

  const allDates = sheetEntries.flatMap(([, points]) =>
    points.map((point) => point.vintage_month),
  );

  if (allDates.length === 0) {
    return { dates: [], series: [] };
  }

  const minDateText = allDates.reduce((minDate, current) =>
    new Date(current).getTime() < new Date(minDate).getTime() ? current : minDate,
  );
  const maxDateText = allDates.reduce((maxDate, current) =>
    new Date(current).getTime() > new Date(maxDate).getTime() ? current : maxDate,
  );

  const dates = buildMonthlyRange(minDateText, maxDateText);

  const series = Object.entries(sheetPointsMap).map(([sheetName, points]) => {
    const valueByDate = new Map<string, number>();

    points.forEach((point) => {
      valueByDate.set(point.vintage_month, point.Value);
    });

    return {
      name: sheetName,
      data: dates.map((date) => valueByDate.get(date) ?? null),
    };
  });

  return { dates, series };
}
