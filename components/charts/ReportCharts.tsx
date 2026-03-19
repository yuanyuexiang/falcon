"use client";

import { useMemo } from "react";

import ReactECharts from "echarts-for-react";

import type { LineChartData, ReportChart, ReportSection, TableChartData, TextBlockItem } from "@/types/reports";

function asLineChartData(data: ReportChart["data"]): LineChartData {
  return data as LineChartData;
}

function asTableChartData(data: ReportChart["data"]): TableChartData {
  return data as TableChartData;
}

function buildLineOption(chart: ReportChart, showLegend: boolean = true) {
  const data = asLineChartData(chart.data);
  const minMax = chart.config?.y_axis_range;

  return {
    color: ["#0ea5e9", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"],
    tooltip: {
      trigger: "axis",
    },
    legend: {
      type: "scroll",
      top: 0,
      show: showLegend,
    },
    grid: {
      top: 56,
      left: 50,
      right: 16,
      bottom: 50,
    },
    dataZoom: [
      {
        type: "inside",
      },
      {
        type: "slider",
        height: 18,
      },
    ],
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: {
        color: "#334155",
      },
    },
    yAxis: {
      type: "value",
      name: chart.config?.y_axis_label ?? "Value",
      min: minMax?.[0],
      max: minMax?.[1],
      axisLabel: {
        color: "#334155",
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
  const table = asTableChartData(chart.data);
  const formattedRows = useMemo(() => {
    return table.rows.map((row) => {
      return row.map((cell) => {
        if (typeof cell === "number") {
          return Number.isInteger(cell) ? cell.toLocaleString("en-US") : cell.toLocaleString("en-US", { maximumFractionDigits: 2 });
        }

        if (cell === null) {
          return "-";
        }

        return String(cell);
      });
    });
  }, [table.rows]);

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
              {table.headers.map((header) => (
                <th key={header} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {formattedRows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700"
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
  const originTrendsLegend = useMemo(() => {
    if (!useThreeColumnGrid) {
      return [] as Array<{ label: string; color: string }>;
    }

    const firstLineChart = charts.find((chart) => chart.chart_type === "line");

    if (!firstLineChart) {
      return [] as Array<{ label: string; color: string }>;
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
    <div className={useThreeColumnGrid ? "grid gap-4 lg:grid-cols-3" : "space-y-4"}>
      {useThreeColumnGrid && originTrendsLegend.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-3">
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
          return <TableChart key={chart.chart_id} chart={chart} />;
        }

        if (chart.chart_type === "line") {
          return (
            <div key={chart.chart_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">{chart.title}</h4>
              <ReactECharts option={buildLineOption(chart, !useThreeColumnGrid)} style={{ width: "100%", height: "320px" }} />
            </div>
          );
        }

        return (
          <div key={chart.chart_id} className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            暂不支持图表类型: {chart.chart_type}
          </div>
        );
      })}

      {charts.length === 0 && textItems.length > 0 && <TextBlocksChart items={textItems} />}
    </div>
  );
}