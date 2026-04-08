"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

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

type HeaderGroup = {
  group_name: string;
  start_col: string;
  end_col: string;
  bg_color?: string;
  font_color?: string;
};

type GroupRange = {
  group: HeaderGroup;
  start: number;
  end: number;
};

const TOKEN_STYLE_MAP: Record<string, CSSProperties> = {
  bg_light_blue: { backgroundColor: "rgba(31, 58, 92, 0.55)" },
  bg_light_yellow: { backgroundColor: "rgba(98, 79, 30, 0.45)" },
  bg_light_green: { backgroundColor: "rgba(25, 82, 62, 0.45)" },
  bg_light_red: { backgroundColor: "rgba(98, 38, 38, 0.45)" },
  font_red: { color: "#C00000" },
  font_green: { color: "#2E7D32" },
  font_blue: { color: "#1F4E78" },
  font_orange: { color: "#ED7D31" },
  font_white: { color: "#FFFFFF" },
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
  underline: { textDecoration: "underline" },
  border_top_thick: { borderTop: "3px solid #1F4E78" },
};

const GROUP_BODY_BG_MAP: Record<string, string> = {
  "pool name": "rgba(27, 44, 66, 0.56)",
  "baseline metrics": "rgba(30, 50, 74, 0.56)",
  "current period": "rgba(72, 58, 30, 0.5)",
};

const HEADER_COLOR_MAP: Record<string, string> = {
  deep_blue: "#1F4E78",
  blue: "#2F75B5",
  white: "#FFFFFF",
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildCellStyle(tokens: string[]): CSSProperties {
  return tokens.reduce<CSSProperties>((acc, token) => ({
    ...acc,
    ...(TOKEN_STYLE_MAP[token] || {}),
  }), {});
}

function normalizeHeaderColor(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return HEADER_COLOR_MAP[normalized] || value;
}

function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

function resolveHeaderCellAlign(align?: string): "text-left" | "text-center" | "text-right" {
  if (align === "right") {
    return "text-right";
  }
  if (align === "center") {
    return "text-center";
  }
  return "text-left";
}

function isFilterColumnKey(key: string): boolean {
  return key.trim().toLowerCase().startsWith("filter");
}

function isTotalRow(row: Record<string, string | number | null>): boolean {
  const firstValue = Object.values(row)[0];
  if (typeof firstValue !== "string") {
    return false;
  }
  return firstValue.trim().toLowerCase() === "total";
}

function buildGroupRanges(columns: Array<{ key: string; title: string; align?: string }>, groups: HeaderGroup[]): GroupRange[] {
  return groups
    .map((group) => {
      const start = columns.findIndex((column) => column.key === group.start_col);
      const end = columns.findIndex((column) => column.key === group.end_col);
      return { group, start, end };
    })
    .filter((item) => item.start >= 0 && item.end >= 0 && item.end >= item.start);
}

function getColumnGroupMap(columns: Array<{ key: string; title: string; align?: string }>, groups: HeaderGroup[]): Map<string, HeaderGroup> {
  const map = new Map<string, HeaderGroup>();
  const ranges = buildGroupRanges(columns, groups);

  ranges.forEach(({ group, start, end }) => {
    for (let index = start; index <= end; index += 1) {
      map.set(columns[index].key, group);
    }
  });

  return map;
}

function toFullDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toYearMonthLabel(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) {
    return value;
  }

  const year = match[1];
  const month = match[2];
  return `${year}-${month}`;
}

function formatDateLabel(value: string | number, axisType?: string): string {
  if (typeof value === "number") {
    // Keep numeric category labels (e.g. 1..150) as-is instead of converting to dates.
    if (axisType === "category") {
      return String(value);
    }

    const absValue = Math.abs(value);
    const isEpochSeconds = absValue >= 946684800 && absValue <= 4102444800;
    const isEpochMilliseconds = absValue >= 946684800000 && absValue <= 4102444800000;

    if (!isEpochSeconds && !isEpochMilliseconds) {
      return String(value);
    }

    const date = new Date(isEpochSeconds ? value * 1000 : value);

    if (!Number.isNaN(date.getTime())) {
      return toYearMonthLabel(toFullDateLabel(date));
    }

    return String(value);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return toYearMonthLabel(`${value}-01`);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return toYearMonthLabel(value.slice(0, 10));
  }

  if (axisType === "category" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return value;
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return toYearMonthLabel(toFullDateLabel(parsed));
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

function normalizeLineChartData(data: ReportChart["data"]): LineChartData {
  const lineData = asLineChartData(data);

  return {
    labels: asArray<string | number>(lineData?.labels),
    datasets: asArray<LineChartData["datasets"][number]>(lineData?.datasets),
  };
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
    presentation?: unknown;
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

  const presentation =
    candidate.presentation && typeof candidate.presentation === "object" && !Array.isArray(candidate.presentation)
      ? (candidate.presentation as TableObjectData["presentation"])
      : undefined;

  return {
    columns,
    rows,
    presentation,
  };
}

function normalizeTablePayload(chart: ReportChart): TableObjectData | TableChartData | null {
  const objectTable = asTableObjectData(chart.table_data) ?? asTableObjectData(chart.table) ?? asTableObjectData(chart.data);

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

function hasLineChartData(chart: ReportChart): boolean {
  if (chart.echarts?.series) {
    return chart.echarts.series.some((series) =>
      (series.data ?? []).some((point) => extractNumericPointValue(point) !== null),
    );
  }

  if (chart.data) {
    const lineData = normalizeLineChartData(chart.data);
    return lineData.datasets.some((dataset) =>
      asArray<unknown>(dataset.data).some((point) => extractNumericPointValue(point) !== null),
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeEchartsOption(option: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...option };
  const rawSeries = Array.isArray(option.series) ? option.series : [];
  const series = rawSeries.map((item) => (asRecord(item) ? { ...(item as Record<string, unknown>) } : item));

  if (!series.length) {
    return next;
  }

  const firstSeries = asRecord(series[0]);
  if (!firstSeries) {
    return next;
  }

  const topMarkArea = asRecord(option.markArea);
  const topMarkLine = asRecord(option.markLine);

  if (!firstSeries.markArea && topMarkArea) {
    firstSeries.markArea = topMarkArea;
  }

  if (!firstSeries.markLine && topMarkLine) {
    firstSeries.markLine = topMarkLine;
  }

  series[0] = firstSeries;
  next.series = series;
  delete next.markArea;
  delete next.markLine;
  return next;
}

function looksLikeAverageLabel(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return /avg|average/i.test(value);
}

function repositionMarkLineLabels(option: Record<string, unknown>): Record<string, unknown> {
  const rawSeries = Array.isArray(option.series) ? option.series : [];
  const series = rawSeries.map((item) => {
    const record = asRecord(item);
    if (!record) {
      return item;
    }

    const markLine = asRecord(record.markLine);
    if (!markLine || !Array.isArray(markLine.data)) {
      return record;
    }

    const nextData = markLine.data.map((lineItem) => {
      const lineRecord = asRecord(lineItem);
      if (!lineRecord) {
        return lineItem;
      }

      const label = asRecord(lineRecord.label) ?? {};
      const hasYAxisReference = typeof lineRecord.yAxis === "number";
      const hasXAxisReference = typeof lineRecord.xAxis === "number" || typeof lineRecord.xAxis === "string";
      const isAverage = looksLikeAverageLabel(lineRecord.name) || looksLikeAverageLabel(label.formatter);

      if (!hasYAxisReference && !hasXAxisReference && !isAverage) {
        return lineRecord;
      }

      if (hasXAxisReference) {
        return {
          ...lineRecord,
          label: {
            ...label,
            show: label.show ?? true,
            color: "#9bc5ea",
          },
        };
      }

      return {
        ...lineRecord,
        label: {
          ...label,
          show: label.show ?? true,
          position: "insideEndBottom",
          offset: [0, 12],
        },
      };
    });

    return {
      ...record,
      markLine: {
        ...markLine,
        data: nextData,
      },
    };
  });

  return {
    ...option,
    series,
  };
}

function applySeriesVisibility(
  option: Record<string, unknown>,
  hiddenSeriesNames?: Set<string>,
): Record<string, unknown> {
  if (!hiddenSeriesNames || hiddenSeriesNames.size === 0) {
    return option;
  }

  const rawSeries = Array.isArray(option.series) ? option.series : [];
  const visibleSeries = rawSeries.filter((item) => {
    const record = asRecord(item);
    if (!record) {
      return true;
    }
    const name = typeof record.name === "string" ? record.name : "";
    return !hiddenSeriesNames.has(name);
  });

  return {
    ...option,
    series: visibleSeries,
  };
}

function isNumericLikeValue(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    return /^-?\d+(\.\d+)?$/.test(trimmed);
  }

  return false;
}

function shouldForceEvenMobTicks(axisType: string, axisData: unknown): boolean {
  if (axisType !== "category" || !Array.isArray(axisData) || axisData.length < 10) {
    return false;
  }

  const numericCount = axisData.filter((item) => isNumericLikeValue(item)).length;
  return numericCount / axisData.length >= 0.9;
}

function withFalconLineDefaults(
  option: Record<string, unknown>,
  showLegend: boolean,
): Record<string, unknown> {
  const gridTop = showLegend ? 44 : 26;
  const gridBottom = 32;
  const legend = asRecord(option.legend) ?? {};
  const grid = asRecord(option.grid) ?? {};
  const tooltip = asRecord(option.tooltip) ?? {};
  const xAxis = asRecord(option.xAxis) ?? {};
  const yAxis = asRecord(option.yAxis) ?? {};
  const xAxisType = typeof xAxis.type === "string" ? xAxis.type : "category";
  const xAxisData = Array.isArray(xAxis.data) ? xAxis.data : [];
  const forceEvenMobTicks = shouldForceEvenMobTicks(xAxisType, xAxisData);

  return {
    ...option,
    color: Array.isArray(option.color) ? option.color : CHART_COLORS,
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
      ...tooltip,
      valueFormatter: (value: number | string | null) => formatTooltipNumber(value),
    },
    legend: {
      type: "scroll",
      top: 0,
      textStyle: {
        color: "#9bc5ea",
      },
      ...legend,
      show: showLegend,
    },
    grid: {
      top: gridTop,
      left: 54,
      right: 20,
      bottom: gridBottom,
      ...grid,
    },
    xAxis: {
      ...xAxis,
      type: xAxisType,
      axisLabel: {
        color: "#9bc5ea",
        hideOverlap: forceEvenMobTicks ? false : true,
        interval: forceEvenMobTicks ? ((index: number) => index % 3 === 0) : "auto",
        formatter: (value: string | number) => formatDateLabel(value, xAxisType),
        ...(asRecord(xAxis.axisLabel) ?? {}),
        ...(forceEvenMobTicks
          ? {
              hideOverlap: false,
              interval: (index: number) => index % 3 === 0,
            }
          : {}),
      },
    },
    yAxis: {
      type: "value",
      name: "Value",
      scale: true,
      ...yAxis,
      axisLabel: {
        color: "#9bc5ea",
        formatter: (value: number) => formatAxisNumber(value),
        ...(asRecord(yAxis.axisLabel) ?? {}),
      },
      splitLine: {
        lineStyle: {
          color: "rgba(137, 179, 220, 0.18)",
        },
        ...(asRecord(yAxis.splitLine) ?? {}),
      },
    },
  };
}

function buildLineOption(chart: ReportChart, showLegend: boolean = true, hiddenSeriesNames?: Set<string>) {
  if (chart.echarts) {
    const backendOption = normalizeEchartsOption(chart.echarts as unknown as Record<string, unknown>);
    const withLineLabelAdjusted = repositionMarkLineLabels(backendOption);
    const withVisibility = applySeriesVisibility(withLineLabelAdjusted, hiddenSeriesNames);
    return withFalconLineDefaults(withVisibility, showLegend);
  }

  const gridTop = showLegend ? 44 : 26;
  const gridBottom = 32;
  const data = normalizeLineChartData(chart.data);
  const minMax = chart.config?.y_axis_range;
  const visibleDatasets = data.datasets.filter((item) => !hiddenSeriesNames?.has(item.label));
  const forceEvenMobTicks = shouldForceEvenMobTicks("category", data.labels);

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
      top: gridTop,
      left: 54,
      right: 20,
      bottom: gridBottom,
    },
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: {
        color: "#9bc5ea",
        hideOverlap: forceEvenMobTicks ? false : true,
        interval: forceEvenMobTicks ? ((index: number) => index % 3 === 0) : "auto",
        formatter: (value: string | number) => formatDateLabel(value, "category"),
      },
    },
    yAxis: {
      type: "value",
      name: chart.config?.y_axis_label ?? "Value",
      min: minMax?.[0],
      max: minMax?.[1],
      scale: true,
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
    const presentation = tablePayload.presentation;
    const headerGroups = asArray<HeaderGroup>(presentation?.header_groups);
    const visibleColumns = columns.filter((column) => !isFilterColumnKey(column.key));
    const groupRanges = buildGroupRanges(visibleColumns, headerGroups);
    const coveredColumnIndexes = new Set<number>();
    groupRanges.forEach(({ start, end }) => {
      for (let index = start; index <= end; index += 1) {
        coveredColumnIndexes.add(index);
      }
    });

    const styleMap = new Map<string, CSSProperties>();
    asArray<unknown>(presentation?.cell_styles).forEach((item) => {
      const rule = asRecord(item);
      if (!rule) {
        return;
      }

      const tokens = Array.isArray(rule.tokens)
        ? rule.tokens.filter((token): token is string => typeof token === "string")
        : [];
      const rowIndex = rule.row_index;
      const column = rule.column;

      if (!tokens.length || typeof rowIndex !== "number" || typeof column !== "string") {
        return;
      }

      styleMap.set(`${rowIndex}:${column}`, buildCellStyle(tokens));
    });

    const groupByColumn = getColumnGroupMap(visibleColumns, headerGroups);

    return (
      <div className="terminal-panel rounded-xl p-4 shadow-sm">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-cyan-100">{chart.title}</h4>
          {chart.subtitle && <p className="mt-1 text-xs text-slate-400">{chart.subtitle}</p>}
        </div>

        <div className="overflow-x-auto rounded-lg border border-cyan-500/20">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-950/70">
              {headerGroups.length > 0 ? (
                <>
                  <tr>
                    {groupRanges.map(({ group, start, end }) => {
                      const childColumns = visibleColumns.slice(start, end + 1);
                      const colSpan = childColumns.length;
                      const isSingle = colSpan === 1;
                      const groupBg = normalizeHeaderColor(group.bg_color) || "#2F75B5";
                      const groupColor = normalizeHeaderColor(group.font_color) || "#FFFFFF";

                      if (isSingle) {
                        return (
                          <th
                            key={`group-single:${group.group_name}:${group.start_col}:${group.end_col}`}
                            rowSpan={2}
                            className="whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 text-center font-semibold"
                            style={{ background: groupBg, color: groupColor }}
                          >
                            {group.group_name}
                          </th>
                        );
                      }

                      return (
                        <th
                          key={`group:${group.group_name}:${group.start_col}:${group.end_col}`}
                          colSpan={colSpan}
                          className="whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 text-center font-semibold"
                          style={{ background: groupBg, color: groupColor }}
                        >
                          {group.group_name}
                        </th>
                      );
                    })}

                    {visibleColumns.map((column, index) => {
                      if (coveredColumnIndexes.has(index)) {
                        return null;
                      }

                      return (
                        <th
                          key={`ungrouped:${column.key}`}
                          rowSpan={2}
                          className={`whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 font-semibold text-slate-200 ${resolveHeaderCellAlign(column.align)}`}
                        >
                          {column.title}
                        </th>
                      );
                    })}
                  </tr>

                  <tr>
                    {visibleColumns.map((column) => {
                      const group = groupByColumn.get(column.key);
                      if (!group) {
                        return null;
                      }
                      const range = groupRanges.find((item) => item.group === group);
                      if (!range) {
                        return null;
                      }

                      if (range.start === range.end) {
                        return null;
                      }

                      const bg = normalizeHeaderColor(group.bg_color) || "#2F75B5";
                      const color = normalizeHeaderColor(group.font_color) || "#FFFFFF";

                      return (
                        <th
                          key={`child:${column.key}`}
                          className={`whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 font-semibold ${resolveHeaderCellAlign(column.align)}`}
                          style={{ background: bg, color }}
                        >
                          {column.title}
                        </th>
                      );
                    })}
                  </tr>
                </>
              ) : (
                <tr>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`whitespace-nowrap border-b border-cyan-500/20 px-3 py-2 font-semibold text-slate-200 ${resolveHeaderCellAlign(column.align)}`}
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className={`${rowIndex % 2 === 0 ? "bg-transparent" : "bg-slate-900/40"} transition hover:bg-cyan-500/8 ${isTotalRow(row) ? "font-semibold" : ""}`}
                >
                  {visibleColumns.map((column) => {
                    const value = row[column.key];
                    const tokenStyle = styleMap.get(`${rowIndex}:${column.key}`);
                    const groupName = normalizeGroupName(groupByColumn.get(column.key)?.group_name || "");
                    const fallbackGroupBg = tokenStyle?.backgroundColor ? undefined : GROUP_BODY_BG_MAP[groupName];

                    return (
                      <td
                        key={`cell-${rowIndex}-${column.key}`}
                        className={`whitespace-nowrap border-b border-cyan-500/10 px-3 py-2 ${
                          column.align === "right"
                            ? "text-right font-medium tabular-nums"
                            : column.align === "center"
                              ? "text-center"
                              : "text-left"
                        }`}
                        style={{
                          ...tokenStyle,
                          ...(fallbackGroupBg ? { backgroundColor: fallbackGroupBg } : {}),
                          color: tokenStyle?.color ?? "#E2E8F0",
                        }}
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
  const visibleIndexes = table.headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => !isFilterColumnKey(header))
    .map(({ index }) => index);

  const columnMeta = visibleIndexes.map((index) => {
    const header = table.headers[index];
    const isNumeric = table.rows.some((row) => typeof row[index] === "number");
    const isDate = /date/i.test(header);
    return { header, isNumeric, isDate };
  });

  const formattedRows = table.rows.map((row) => {
    return visibleIndexes.map((index, visibleColIndex) => {
      const cell = row[index];
      const meta = columnMeta[visibleColIndex];

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
  const charts = useMemo(() => asArray<ReportChart>(section.content_items?.charts), [section.content_items?.charts]);
  const textItems = useMemo(() => asArray<TextBlockItem>(section.content_items?.items), [section.content_items?.items]);
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

          return (
            <div key={chart.chart_id} className="terminal-panel rounded-xl p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold text-cyan-100">{chart.title}</h4>
              </div>
              <ReactECharts
                option={buildLineOption(chart, !useSharedLegend, effectiveHiddenSeriesNames)}
                notMerge
                style={{ width: "100%", height: "300px" }}
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