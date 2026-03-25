"use client";

import { useMemo } from "react";

import ReactECharts from "echarts-for-react";

import type { LineChartData, ReportChart, ReportSection, TableChartData, TextBlockItem } from "@/types/reports";

const CHART_COLORS = ["#0B3C5D", "#1D70A2", "#2AA198", "#6B7280", "#E76F51", "#3C6E71"];

function formatDateLabel(value: string | number): string {
  if (typeof value !== "string") {
    return String(value);
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return `${year.slice(2)}-${month}`;
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

function buildLineOption(chart: ReportChart, showLegend: boolean = true) {
  if (chart.echarts) {
    const axisData = chart.echarts.xAxis?.data ?? [];
    const series = chart.echarts.series ?? [];

    return {
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.86)",
        borderWidth: 0,
        textStyle: {
          color: "#f8fafc",
          fontSize: 12,
        },
        extraCssText: "border-radius:10px;box-shadow:0 10px 30px rgba(15,23,42,0.2);",
        valueFormatter: (value: number | string | null) => formatTooltipNumber(value),
      },
      legend: {
        type: "scroll",
        top: 0,
        show: showLegend,
        textStyle: {
          color: "#475569",
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
          color: "#334155",
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
          color: "#334155",
          formatter: (value: number) => formatAxisNumber(value),
        },
        splitLine: {
          lineStyle: {
            color: "#e2e8f0",
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

  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.86)",
      borderWidth: 0,
      textStyle: {
        color: "#f8fafc",
        fontSize: 12,
      },
      extraCssText: "border-radius:10px;box-shadow:0 10px 30px rgba(15,23,42,0.2);",
      valueFormatter: (value: number | string | null) => formatTooltipNumber(value),
    },
    legend: {
      type: "scroll",
      top: 0,
      show: showLegend,
      textStyle: {
        color: "#475569",
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
        color: "#334155",
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
        color: "#334155",
        formatter: (value: number) => formatAxisNumber(value),
      },
      splitLine: {
        lineStyle: {
          color: "#e2e8f0",
        },
      },
    },
    series: data.datasets.map((item) => ({
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
  if (chart.table) {
    const { columns, rows } = chart.table;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-slate-900">{chart.title}</h4>
          {chart.subtitle && <p className="mt-1 text-xs text-slate-500">{chart.subtitle}</p>}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 ${
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
                  className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"} transition hover:bg-cyan-50/50`}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td
                        key={`cell-${rowIndex}-${column.key}`}
                        className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700 ${
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

  const table = asTableChartData(chart.data);
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-900">{chart.title}</h4>
        {chart.subtitle && <p className="mt-1 text-xs text-slate-500">{chart.subtitle}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-slate-100">
            <tr>
              {columnMeta.map((meta) => (
                <th
                  key={meta.header}
                  className={`whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 ${
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
                className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"} transition hover:bg-cyan-50/50`}
              >
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700 ${
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
        color: "#334155",
      },
    },
    yAxis: {
      type: "value",
      name: "Text Length",
      axisLabel: {
        color: "#334155",
      },
      splitLine: {
        lineStyle: {
          color: "#e2e8f0",
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">Text Blocks Overview</h4>
      <ReactECharts option={option} style={{ width: "100%", height: "260px" }} />
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <p key={`${item.type}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ReportSectionCharts({ section }: { section: ReportSection }) {
  const charts = useMemo(() => section.content_items.charts ?? [], [section.content_items.charts]);
  const textItems = useMemo(() => section.content_items.items ?? [], [section.content_items.items]);
  const useThreeColumnGrid = section.section_key === "origination_trends";
  const chartGridClass = useThreeColumnGrid ? "grid gap-4 lg:grid-cols-2" : "grid gap-4 lg:grid-cols-2";
  const originTrendsLegend = useMemo(() => {
    if (!useThreeColumnGrid) {
      return [] as Array<{ label: string; color: string }>;
    }

    const firstLineChart = charts.find((chart) => chart.chart_type === "line");

    if (!firstLineChart) {
      return [] as Array<{ label: string; color: string }>;
    }

    if (firstLineChart.echarts?.series) {
      const fallbackColors = ["#0ea5e9", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];
      return firstLineChart.echarts.series.map((series, index) => {
        return {
          label: series.name,
          color: series.lineStyle?.color ?? series.itemStyle?.color ?? fallbackColors[index % fallbackColors.length],
        };
      });
    }

    const lineData = asLineChartData(firstLineChart.data);

    return lineData.datasets.map((dataset, index) => {
      const fallbackColors = ["#0ea5e9", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];
      return {
        label: dataset.label,
        color: dataset.borderColor ?? dataset.backgroundColor ?? fallbackColors[index % fallbackColors.length],
      };
    });
  }, [charts, useThreeColumnGrid]);

  if (charts.length === 0 && textItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        当前子菜单暂无可视化数据。
      </div>
    );
  }

  return (
    <div className={chartGridClass}>
      {useThreeColumnGrid && originTrendsLegend.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {originTrendsLegend.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="inline-block h-0.5 w-6" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {charts.map((chart) => {
        if (chart.chart_type === "table") {
          return (
            <div key={chart.chart_id} className="lg:col-span-2">
              <TableChart chart={chart} />
            </div>
          );
        }

        if (chart.chart_type === "line") {
          return (
            <div key={chart.chart_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">{chart.title}</h4>
              <ReactECharts option={buildLineOption(chart, !useThreeColumnGrid)} style={{ width: "100%", height: "340px" }} />
            </div>
          );
        }

        return (
          <div
            key={chart.chart_id}
            className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 lg:col-span-2"
          >
            暂不支持图表类型: {chart.chart_type}
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