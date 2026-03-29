"use client";

import { useMemo } from "react";

import ReactECharts from "echarts-for-react";

import type {
  LineChartData,
  ReportChart,
  ReportSection,
  TableChartData,
  TableObjectData,
  TextBlockItem,
} from "@/types/reports";

const CHART_COLORS = ["#00B7FF", "#33D1FF", "#2D7BFF", "#00D084", "#F5B700", "#FF4D57"];

function formatDateLabel(value: string | number): string {
  if (typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      const year = String(date.getFullYear()).slice(2);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }

    return String(value);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return `${year.slice(2)}-${month}`;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month] = value.split("-");
    return `${year.slice(2)}-${month}`;
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    const year = String(parsed.getFullYear()).slice(2);
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  return value;
}

function formatAxisNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(2);
}

function formatTooltipNumber(value: number | string | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value === null ? "-" : String(value ?? "-");
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(3)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(3)}M`;
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function asLineChartData(data: ReportChart["data"]): LineChartData {
  return data as LineChartData;
}

function asTableChartData(data: ReportChart["data"]): TableChartData {
  return data as TableChartData;
}

function asTableObjectData(data: unknown): TableObjectData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as {
    columns?: unknown;
    rows?: unknown;
  };

  if (!Array.isArray(candidate.columns) || !Array.isArray(candidate.rows)) {
    return null;
  }

  const columns = candidate.columns.filter(
    (item): item is TableObjectData["columns"][number] =>
      !!item && typeof item === "object" && typeof (item as { key?: unknown }).key === "string",
  );

  const rows = candidate.rows.filter(
    (item): item is Record<string, string | number | null> => !!item && typeof item === "object" && !Array.isArray(item),
  );

  if (columns.length === 0) {
    return null;
  }

  return {
    columns,
    rows,
  };
}

function normalizeTablePayload(chart: ReportChart): TableObjectData | TableChartData | null {
  const objectTable = asTableObjectData(chart.table) ?? asTableObjectData(chart.table_data) ?? asTableObjectData(chart.data);

  if (objectTable) {
    return objectTable;
  }

  if (chart.data) {
    const fallback = asTableChartData(chart.data);
    if (Array.isArray(fallback.headers) && Array.isArray(fallback.rows)) {
      return fallback;
    }
  }

  return null;
}

function isTableChart(chart: ReportChart): boolean {
  const normalizedType = String(chart.chart_type ?? "").toLowerCase();
  return normalizedType === "table" || normalizedType === "table_data" || normalizeTablePayload(chart) !== null;
}

type TrendDirection = "up" | "down" | "flat";

interface TrendInfo {
  direction: TrendDirection;
  changePct: number;
}

function extractNumericPointValue(point: unknown): number | null {
  if (typeof point === "number" && Number.isFinite(point)) {
    return point;
  }

  if (Array.isArray(point) && point.length >= 2) {
    const value = point[1];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  if (point && typeof point === "object") {
    const candidate = point as { value?: unknown };

    if (typeof candidate.value === "number" && Number.isFinite(candidate.value)) {
      return candidate.value;
    }

    if (Array.isArray(candidate.value) && candidate.value.length >= 2) {
      const tupleValue = candidate.value[1];
      if (typeof tupleValue === "number" && Number.isFinite(tupleValue)) {
        return tupleValue;
      }
    }
  }

  return null;
}

function deriveTrend(values: unknown[]): TrendInfo {
  const normalized = values
    .map((value) => extractNumericPointValue(value))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (normalized.length < 2) {
    return { direction: "flat", changePct: 0 };
  }

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  const delta = last - first;

  if (first === 0) {
    return {
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      changePct: 0,
    };
  }

  const changePct = (delta / Math.abs(first)) * 100;

  if (Math.abs(changePct) < 0.01) {
    return { direction: "flat", changePct: 0 };
  }

  return {
    direction: changePct > 0 ? "up" : "down",
    changePct,
  };
}

function getChartTrend(chart: ReportChart): TrendInfo {
  if (chart.echarts?.series && chart.echarts.series.length > 0) {
    const primarySeries = chart.echarts.series[0];
    return deriveTrend(primarySeries.data ?? []);
  }

  if (chart.data) {
    const lineData = asLineChartData(chart.data);
    const primaryDataset = lineData.datasets[0];
    return deriveTrend(primaryDataset?.data ?? []);
  }

  return { direction: "flat", changePct: 0 };
}

function trendStyles(direction: TrendDirection): string {
  if (direction === "up") {
    return "bg-emerald-500/20 text-emerald-200 border border-emerald-400/35";
  }

  if (direction === "down") {
    return "bg-red-500/20 text-red-200 border border-red-400/35";
  }

  return "bg-slate-500/20 text-slate-200 border border-slate-400/35";
}

function trendLabel(direction: TrendDirection): string {
  if (direction === "up") {
    return "UP";
  }

  if (direction === "down") {
    return "DOWN";
  }

  return "FLAT";
}

function hasLineChartData(chart: ReportChart): boolean {
  if (chart.echarts?.series) {
    return chart.echarts.series.some((series) =>
      (series.data ?? []).some((point) => extractNumericPointValue(point) !== null),
    );
  }

  if (chart.data) {
    const lineData = asLineChartData(chart.data);
    return lineData.datasets.some((dataset) =>
      dataset.data.some((point) => extractNumericPointValue(point) !== null),
    );
  }

  return false;
}

function hasTableChartData(chart: ReportChart): boolean {
  const tableData = normalizeTablePayload(chart);

  if (!tableData) {
    return false;
  }

  if ("columns" in tableData) {
    return tableData.rows.length > 0;
  }

  return tableData.rows.length > 0;
}

function buildLineOption(chart: ReportChart, showLegend: boolean = true, hiddenSeriesNames?: Set<string>) {
  if (chart.echarts) {
    const axisData = chart.echarts.xAxis?.data ?? [];
    const series = (chart.echarts.series ?? []).filter((item) => !hiddenSeriesNames?.has(item.name));

    return {
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(5, 10, 20, 0.92)",
        borderWidth: 1,
        borderColor: "rgba(51, 209, 255, 0.5)",
        textStyle: {
          color: "#d9f3ff",
          fontSize: 12,
        },
        extraCssText: "border-radius:10px;box-shadow:0 12px 30px rgba(0,183,255,0.16);",
        valueFormatter: (value: number | string | null) => formatTooltipNumber(value),
      },
      legend: {
        type: "scroll",
        top: 0,
        show: showLegend,
        textStyle: {
          color: "#9bc5ea",
        },
      },
      grid: {
        top: 56,
        left: 54,
        right: 20,
        bottom: 50,
      },
      xAxis: {
        type: chart.echarts.xAxis?.type ?? "category",
        data: axisData,
        axisLabel: {
          color: "#9bc5ea",
          hideOverlap: true,
          interval: "auto",
          formatter: (value: string | number) => formatDateLabel(value),
        },
      },
      yAxis: {
        type: chart.echarts.yAxis?.type ?? "value",
        name: chart.echarts.yAxis?.name ?? "Value",
        min: chart.echarts.yAxis?.min,
        max: chart.echarts.yAxis?.max,
        axisLabel: {
          color: "#9bc5ea",
          formatter: (value: number) => formatAxisNumber(value),
        },
        splitLine: {
          lineStyle: {
            color: "rgba(137, 179, 220, 0.18)",
          },
        },
      },
      series: series.map((item) => ({
        ...item,
        emphasis: {
          focus: "series",
          lineStyle: {
            width: (item.lineStyle?.width ?? 2) + 2,
            color: item.lineStyle?.color,
          },
        },
      })),
    };
  }

  const data = asLineChartData(chart.data);
  const minMax = chart.config?.y_axis_range;
  const visibleDatasets = data.datasets.filter((item) => !hiddenSeriesNames?.has(item.label));

  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(5, 10, 20, 0.92)",
      borderWidth: 1,
      borderColor: "rgba(51, 209, 255, 0.5)",
      textStyle: {
        color: "#d9f3ff",
        fontSize: 12,
      },
      extraCssText: "border-radius:10px;box-shadow:0 12px 30px rgba(0,183,255,0.16);",
      valueFormatter: (value: number | string | null) => formatTooltipNumber(value),
    },
    legend: {
      type: "scroll",
      top: 0,
      show: showLegend,
      textStyle: {
        color: "#9bc5ea",
      },
    },
    grid: {
      top: 56,
      left: 54,
      right: 20,
      bottom: 50,
    },
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: {
        color: "#9bc5ea",
        hideOverlap: true,
        interval: "auto",
        formatter: (value: string | number) => formatDateLabel(value),
      },
    },
    yAxis: {
      type: "value",
      name: chart.config?.y_axis_label ?? "Value",
      min: minMax?.[0],
      max: minMax?.[1],
      axisLabel: {
        color: "#9bc5ea",
        formatter: (value: number) => formatAxisNumber(value),
      },
      splitLine: {
        lineStyle: {
          color: "rgba(137, 179, 220, 0.18)",
        },
      },
    },
    series: visibleDatasets.map((item) => ({
      name: item.label,
      type: item.showLine === false ? "scatter" : "line",
      smooth: chart.config?.smooth_line ?? false,
      connectNulls: item.spanGaps ?? true,
      showSymbol: item.showLine === false || (item.pointRadius ?? 0) > 0,
      symbolSize: item.pointRadius ?? 5,
      lineStyle: {
        width: item.borderWidth ?? 2,
        color: item.borderColor,
        type: /management/i.test(item.label) ? "dashed" : "solid",
      },
      emphasis: {
        focus: "series",
        lineStyle: {
          width: (item.borderWidth ?? 2) + 2,
          color: item.borderColor,
        },
      },
      itemStyle: {
        color: item.pointBackgroundColor ?? item.borderColor ?? item.backgroundColor,
      },
      data: item.data,
    })),
  };
}

function TableChart({ chart }: { chart: ReportChart }) {
  const tablePayload = normalizeTablePayload(chart);

  if (!tablePayload) {
    return (
      <div className="terminal-panel rounded-xl p-5 text-sm text-slate-300">
        No table data available for current filters.
      </div>
    );
  }

  if ("columns" in tablePayload) {
    const { columns, rows } = tablePayload;

    return (
      <div className="terminal-panel rounded-xl p-4 shadow-sm">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-cyan-100">{chart.title}</h4>
          {chart.subtitle && <p className="mt-1 text-xs text-slate-400">{chart.subtitle}</p>}
        </div>

        <div className="overflow-x-auto rounded-lg border border-cyan-500/20">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-950/70">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 font-semibold text-slate-200 ${
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className={`${rowIndex % 2 === 0 ? "bg-transparent" : "bg-slate-900/40"} transition hover:bg-cyan-500/8`}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td
                        key={`cell-${rowIndex}-${column.key}`}
                        className={`whitespace-nowrap border-b border-cyan-500/10 px-3 py-2 text-slate-200 ${
                          column.align === "right"
                            ? "text-right font-medium tabular-nums"
                            : column.align === "center"
                              ? "text-center"
                              : "text-left"
                        }`}
                      >
                        {value === null ? "-" : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const table = tablePayload;
  const columnMeta = table.headers.map((header, index) => {
    const isNumeric = table.rows.some((row) => typeof row[index] === "number");
    const isDate = /date/i.test(header);
    return { header, isNumeric, isDate };
  });

  const formattedRows = table.rows.map((row) => {
    return row.map((cell, index) => {
      const meta = columnMeta[index];

      if (typeof cell === "number") {
        if (Math.abs(cell) >= 1_000_000_000) {
          return `${(cell / 1_000_000_000).toFixed(2)}B`;
        }

        if (Math.abs(cell) >= 1_000_000) {
          return `${(cell / 1_000_000).toFixed(2)}M`;
        }

        if (meta?.isDate) {
          return String(cell);
        }

        return Number.isInteger(cell)
          ? cell.toLocaleString("en-US")
          : cell.toLocaleString("en-US", { maximumFractionDigits: 2 });
      }

      if (cell === null) {
        return "-";
      }

      return String(cell);
    });
  });

  return (
    <div className="terminal-panel rounded-xl p-4 shadow-sm">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-cyan-100">{chart.title}</h4>
        {chart.subtitle && <p className="mt-1 text-xs text-slate-400">{chart.subtitle}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-cyan-500/20">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-slate-950/70">
            <tr>
              {columnMeta.map((meta) => (
                <th
                  key={meta.header}
                  className={`whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 font-semibold text-slate-200 ${
                    meta.isNumeric ? "text-right" : meta.isDate ? "text-center" : "text-left"
                  }`}
                >
                  {meta.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {formattedRows.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className={`${rowIndex % 2 === 0 ? "bg-transparent" : "bg-slate-900/40"} transition hover:bg-cyan-500/8`}
              >
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`whitespace-nowrap border-b border-cyan-500/10 px-3 py-2 text-slate-200 ${
                      columnMeta[colIndex]?.isNumeric
                        ? "text-right font-medium tabular-nums"
                        : columnMeta[colIndex]?.isDate
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextBlocksChart({ items }: { items: TextBlockItem[] }) {
  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    grid: {
      top: 20,
      left: 50,
      right: 20,
      bottom: 30,
    },
    xAxis: {
      type: "category",
      data: items.map((_, index) => `Paragraph ${index + 1}`),
      axisLabel: {
        color: "#9bc5ea",
      },
    },
    yAxis: {
      type: "value",
      name: "Text Length",
      axisLabel: {
        color: "#9bc5ea",
      },
      splitLine: {
        lineStyle: {
          color: "rgba(137, 179, 220, 0.18)",
        },
      },
    },
    series: [
      {
        type: "bar",
        data: items.map((item) => item.text.length),
        itemStyle: {
          color: "#0f766e",
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  return (
    <div className="terminal-panel rounded-xl p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-semibold text-cyan-100">Text Blocks Overview</h4>
      <ReactECharts option={option} style={{ width: "100%", height: "260px" }} />
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <p key={`${item.type}-${index}`} className="rounded-lg bg-slate-950/55 px-3 py-2 text-sm text-slate-200">
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}

interface ReportSectionChartsProps {
  section: ReportSection;
  sharedLegendEnabled?: boolean;
  hiddenSeriesNames?: Set<string>;
}

export function ReportSectionCharts({
  section,
  sharedLegendEnabled,
  hiddenSeriesNames,
}: ReportSectionChartsProps) {
  const charts = useMemo(() => section.content_items.charts ?? [], [section.content_items.charts]);
  const textItems = useMemo(() => section.content_items.items ?? [], [section.content_items.items]);
  const chartGridClass = "grid gap-4 lg:grid-cols-2";
  const lineChartCount = useMemo(() => charts.filter((chart) => chart.chart_type === "line").length, [charts]);
  const useSharedLegend = sharedLegendEnabled ?? lineChartCount > 1;
  const effectiveHiddenSeriesNames = useSharedLegend ? hiddenSeriesNames : undefined;

  if (charts.length === 0 && textItems.length === 0) {
    return (
      <div className="terminal-panel rounded-xl border-dashed p-8 text-sm text-slate-300">
        No chart data is available for this section.
      </div>
    );
  }

  return (
    <div className={chartGridClass}>
      {charts.map((chart) => {
        if (isTableChart(chart)) {
          if (!hasTableChartData(chart)) {
            return (
              <div key={chart.chart_id} className="terminal-panel rounded-xl p-5 text-sm text-slate-300 lg:col-span-2">
                No table data available for current filters.
              </div>
            );
          }

          return (
            <div key={chart.chart_id} className="lg:col-span-2">
              <TableChart chart={chart} />
            </div>
          );
        }

        if (chart.chart_type === "line") {
          if (!hasLineChartData(chart)) {
            return (
              <div key={chart.chart_id} className="terminal-panel rounded-xl p-5 text-sm text-slate-300">
                No chart data available for current filters.
              </div>
            );
          }

          const trend = getChartTrend(chart);

          return (
            <div key={chart.chart_id} className="terminal-panel rounded-xl p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold text-cyan-100">{chart.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                    LIVE SNAPSHOT
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendStyles(trend.direction)}`}>
                    {trendLabel(trend.direction)} {trend.changePct >= 0 ? "+" : ""}
                    {trend.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
              <ReactECharts
                option={buildLineOption(chart, !useSharedLegend, effectiveHiddenSeriesNames)}
                notMerge
                style={{ width: "100%", height: "340px" }}
              />
            </div>
          );
        }

        return (
          <div
            key={chart.chart_id}
            className="terminal-panel rounded-xl border-dashed p-4 text-sm text-slate-300 lg:col-span-2"
          >
            Unsupported chart type: {chart.chart_type}
          </div>
        );
      })}

      {charts.length === 0 && textItems.length > 0 && (
        <div className="lg:col-span-2">
          <TextBlocksChart items={textItems} />
        </div>
      )}
    </div>
  );
}