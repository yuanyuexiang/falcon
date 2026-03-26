"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileBarChart2, RefreshCcw } from "lucide-react";

import { fetchReports } from "@/services/reports";
import type { ReportListItem } from "@/types/reports";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-slate-200 text-slate-700",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const list = await fetchReports();
      setReports(list);
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
    return [...reports].sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  return (
    <main className="min-h-screen bg-slate-100/80">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Falcon</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Reports Hub</h1>
              <p className="mt-2 text-sm text-slate-600">Select a report card to open its dashboard chapters and charts.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadReports();
              }}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh List
            </button>
          </div>
        </header>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading reports...</div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">{error}</div>
        )}

        {!isLoading && !error && sortedReports.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No reports found.</div>
        )}

        {!isLoading && !error && sortedReports.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedReports.map((report) => {
              const cardKey = `${report.report_key}-${report.id}`;

              return (
                <Link
                  key={cardKey}
                  href={`/dashboard?reportId=${encodeURIComponent(report.report_key)}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-lg bg-cyan-100 p-2 text-cyan-700">
                      <FileBarChart2 className="h-5 w-5" />
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_STYLES[report.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-slate-900">{report.name}</h2>

                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>Report Key: {report.report_key}</p>
                    <p>Type: {report.type}</p>
                  </div>

                  <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-cyan-700 transition group-hover:gap-2">
                    View Report
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
