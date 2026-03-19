"use client";

import ReactECharts from "echarts-for-react";

import type { StackedSeries } from "@/utils/transform";

interface LineChartProps {
  title: string;
  dates: string[];
  series: StackedSeries[];
}

export function LineChart({ title, dates, series }: LineChartProps) {
  const option = {
    color: ["#0F4C81", "#1BA39C", "#2E8B57"],
    title: {
      text: title,
      left: "left",
      textStyle: {
        color: "#0f172a",
        fontSize: 16,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "axis",
    },
    legend: {
      top: 30,
      data: series.map((item) => item.name),
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      axisLabel: {
        color: "#334155",
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#334155",
      },
      splitLine: {
        lineStyle: {
          color: "#e2e8f0",
        },
      },
    },
    series: series.map((item) => ({
      name: item.name,
      type: "line",
      smooth: true,
      connectNulls: true,
      data: item.data,
      lineStyle: {
        width: 3,
      },
    })),
  };

  return <ReactECharts option={option} style={{ height: "420px", width: "100%" }} />;
}
