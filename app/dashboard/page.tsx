"use client";

import { useEffect, useMemo, useState } from "react";

import { LineChart } from "@/components/charts/LineChart";
import { fetchMetrics } from "@/services/metrics";
import type { MetricPoint, MetricsResponse } from "@/types/metrics";
import { transformSheetsToStackedChartData } from "@/utils/transform";

const DEFAULT_METRIC = "Annual_Inc";
const DEFAULT_SHEETS = ["Tapes", "Platform"];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<Record<string, MetricPoint[]>>({});
  const [selectedMetric, setSelectedMetric] = useState<string>(DEFAULT_METRIC);
  const [selectedSheets, setSelectedSheets] = useState<string[]>(DEFAULT_SHEETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadMetricsList = async (): Promise<string[]> => {
    const response = await fetchMetrics({ sheet: DEFAULT_SHEETS[1] });
    return response.metrics;
  };

  const loadSheetData = async (metric: string, sheets: string[]) => {
    const responses = await Promise.all(
      sheets.map((sheet) => fetchMetrics({ metric, sheet })),
    );

    const nextData: Record<string, MetricPoint[]> = {};

    sheets.forEach((sheet, index) => {
      const response = responses[index] as MetricsResponse;
      nextData[sheet] = response.grouped[metric] ?? [];
    });

    return nextData;
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const list = await loadMetricsList();

        const effectiveMetric = list.includes(selectedMetric)
          ? selectedMetric
          : (list[0] ?? DEFAULT_METRIC);

        const dataBySheet = await loadSheetData(effectiveMetric, selectedSheets);

        if (!mounted) {
          return;
        }

        setMetrics(list);
        setSheetData(dataBySheet);

        if (effectiveMetric !== selectedMetric) {
          setSelectedMetric(effectiveMetric);
        }

        setError("");
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "加载数据失败");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [selectedMetric, selectedSheets]);

  const chartData = useMemo(() => {
    if (!selectedMetric || selectedSheets.length === 0) {
      return { dates: [], series: [] };
    }

    return transformSheetsToStackedChartData(sheetData);
  }, [sheetData, selectedMetric, selectedSheets]);

  const handleSheetToggle = (sheet: string) => {
    setSelectedSheets((prev) => {
      if (prev.includes(sheet)) {
        return prev.filter((item) => item !== sheet);
      }

      return [...prev, sheet];
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Loan BI Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              贷款核心指标趋势分析（按 Sheet 多折线展示）
            </p>
          </div>

          <div className="grid w-full gap-4 sm:max-w-lg sm:grid-cols-2">
            <div>
              <label htmlFor="metric-selector" className="mb-2 block text-sm font-medium text-slate-700">
                指标选择器
              </label>
              <select
                id="metric-selector"
                value={selectedMetric}
                onChange={(event) => setSelectedMetric(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-600 transition focus:ring-2"
                disabled={isLoading || metrics.length === 0}
              >
                {metrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {metric}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium text-slate-700">Sheet 选择</p>
              <div className="flex items-center gap-4 rounded-lg border border-slate-300 bg-white px-3 py-2">
                {DEFAULT_SHEETS.map((sheet) => (
                  <label key={sheet} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedSheets.includes(sheet)}
                      onChange={() => handleSheetToggle(sheet)}
                      disabled={isLoading}
                    />
                    {sheet}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </header>

        {isLoading && <p className="text-sm text-slate-600">Loading...</p>}

        {!isLoading && error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && chartData.dates.length > 0 && chartData.series.length > 0 && (
          <LineChart
            title={`${selectedMetric} by Sheet (Multi-Line Trend)`}
            dates={chartData.dates}
            series={chartData.series}
          />
        )}

        {!isLoading && !error && (chartData.dates.length === 0 || chartData.series.length === 0) && (
          <p className="text-sm text-slate-600">当前指标暂无可展示数据。</p>
        )}

        {!isLoading && !error && selectedSheets.length === 0 && (
          <p className="text-sm text-amber-700">请至少选择一个 Sheet。</p>
        )}
      </div>
    </main>
  );
}
