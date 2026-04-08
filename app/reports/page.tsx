"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileBarChart2, RefreshCcw } from "lucide-react";

import { fetchReports } from "@/services/reports";
import type { ReportListItem } from "@/types/reports";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-200",
  draft: "bg-amber-500/20 text-amber-200",
  archived: "bg-slate-500/20 text-slate-200",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const list = await fetchReports();
      setReports(Array.isArray(list) ? list : []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load report list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const sortedReports = useMemo(() => {
    const safeReports = Array.isArray(reports) ? reports : [];
    return [...safeReports].sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportListItem[]>();

    sortedReports.forEach((report) => {
      const groupKey = typeof report.type === "string" && report.type.trim().length > 0
        ? report.type.trim()
        : "Uncategorized";
      const current = groups.get(groupKey) ?? [];
      current.push(report);
      groups.set(groupKey, current);
    });

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, items]) => ({ type, items }));
  }, [sortedReports]);

  return (
    <main className="terminal-gridline min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="terminal-shell mb-5 rounded-2xl p-5 sm:p-6">
          <div className="terminal-ticker mb-5 rounded-lg py-2 text-xs text-slate-200">
            <div className="terminal-ticker-track">
              <div className="flex items-center gap-6 px-4">
                <span className="inline-flex items-center gap-2">
                  <span className="terminal-live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  LIVE FEED
                </span>
                <span className="text-cyan-200">NASDAQ STYLE TERMINAL</span>
                <span>US CREDIT ANALYTICS</span>
                <span className="text-emerald-300">LATENCY 42ms</span>
                <span>SNAPSHOT MODE</span>
                <span className="text-red-300">VOLATILITY 0.72</span>
                <span>FALCON RESEARCH DESK</span>
              </div>
              <div className="flex items-center gap-6 px-4" aria-hidden="true">
                <span className="inline-flex items-center gap-2">
                  <span className="terminal-live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  LIVE FEED
                </span>
                <span className="text-cyan-200">NASDAQ STYLE TERMINAL</span>
                <span>US CREDIT ANALYTICS</span>
                <span className="text-emerald-300">LATENCY 42ms</span>
                <span>SNAPSHOT MODE</span>
                <span className="text-red-300">VOLATILITY 0.72</span>
                <span>FALCON RESEARCH DESK</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="terminal-kicker text-xs font-semibold uppercase">Falcon Exchange</p>
              <h1 className="mt-1 text-2xl font-semibold text-cyan-200">Reports Hub</h1>
              <p className="mt-2 text-sm text-slate-300">Select a report card to open its dashboard chapters and charts.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadReports();
              }}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh List
            </button>
          </div>

          <div className="mt-5 grid gap-2 rounded-xl border border-cyan-500/20 bg-slate-950/50 p-3 text-xs text-slate-300 sm:grid-cols-3">
            <p>MARKET: US CREDIT ANALYTICS</p>
            <p className="text-cyan-200">STATUS: LIVE SNAPSHOT</p>
            <p className="sm:text-right">FEED: /consultant/api/v1/reports</p>
          </div>
        </header>

        {isLoading && (
          <div className="terminal-panel rounded-2xl p-6 text-sm text-slate-200">Loading reports...</div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
        )}

        {!isLoading && !error && sortedReports.length === 0 && (
          <div className="terminal-panel rounded-2xl p-6 text-sm text-slate-300">No reports found.</div>
        )}

        {!isLoading && !error && groupedReports.length > 0 && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {groupedReports.map(({ type, items }) => (
              <div key={type} className="terminal-shell h-full rounded-2xl p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-1.5">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{type}</h2>
                  <span className="text-xs text-slate-400">{items.length} report{items.length > 1 ? "s" : ""}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {items.map((report) => {
                    const cardKey = `${report.report_key}-${report.id}`;

                    return (
                      <Link
                        key={cardKey}
                        href={`/dashboard?reportId=${encodeURIComponent(report.report_key)}`}
                        className="terminal-panel group rounded-xl p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_0_24px_rgba(0,183,255,0.2)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 p-1.5 text-cyan-200">
                            <FileBarChart2 className="h-4 w-4" />
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              STATUS_STYLES[report.status] ?? "bg-slate-500/20 text-slate-200"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>

                        <h3 className="mt-2.5 line-clamp-2 text-base font-semibold text-cyan-100">{report.name}</h3>

                        <div className="mt-2 text-xs text-slate-300">
                          <p>{formatUpdatedAt(report.updated_at)}</p>
                        </div>

                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 transition group-hover:gap-2">
                          View Report
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function formatUpdatedAt(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Updated: --";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `Updated: ${value}`;
  }

  return `Updated: ${date.toLocaleString("zh-CN", { hour12: false })}`;
}
