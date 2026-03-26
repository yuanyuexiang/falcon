"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Building2, ChevronRight } from "lucide-react";

import { ReportSectionCharts } from "@/components/charts/ReportCharts";
import { fetchReport } from "@/services/reports";
import type { ReportChapter, ReportDocument, ReportSection } from "@/types/reports";

function normalizeChapters(report: ReportDocument | null): ReportChapter[] {
  if (!report) {
    return [];
  }

  if (report.chapters && report.chapters.length > 0) {
    return [...report.chapters]
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        ...chapter,
        sections: [...chapter.sections].sort((a, b) => a.order - b.order),
      }));
  }

  const fallbackSections = [...(report.sections ?? [])].sort((a, b) => a.order - b.order);

  if (fallbackSections.length === 0) {
    return [];
  }

  return [
    {
      chapter_key: "default_chapter",
      title: report.name,
      subtitle: null,
      order: 1,
      status: report.status,
      sections: fallbackSections,
    },
  ];
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-700",
};

export default function DashboardPage() {
  const [reportId, setReportId] = useState<string>("test");
  const [report, setReport] = useState<ReportDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeChapterKey, setActiveChapterKey] = useState<string>("");
  const [activeSectionKey, setActiveSectionKey] = useState<string>("");

  useEffect(() => {
    const queryReportId = new URLSearchParams(window.location.search).get("reportId")?.trim();

    if (queryReportId && queryReportId !== reportId) {
      setReportId(queryReportId);
    }
  }, [reportId]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const fetchedReport = await fetchReport(reportId);

        if (!mounted) {
          return;
        }

        setReport(fetchedReport);
        setError("");
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load report");
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
  }, [reportId]);

  const chapters = useMemo(() => normalizeChapters(report), [report]);

  const activeChapter = useMemo(() => {
    return chapters.find((chapter) => chapter.chapter_key === activeChapterKey) ?? null;
  }, [chapters, activeChapterKey]);

  const activeSections = useMemo(() => {
    if (!activeChapter) {
      return [] as ReportSection[];
    }

    return [...activeChapter.sections].sort((a, b) => a.order - b.order);
  }, [activeChapter]);

  useEffect(() => {
    if (chapters.length === 0) {
      setActiveChapterKey("");
      return;
    }

    const chapterExists = chapters.some((chapter) => chapter.chapter_key === activeChapterKey);

    if (!chapterExists) {
      const firstChapter = chapters[0];
      setActiveChapterKey(firstChapter.chapter_key);
      setActiveSectionKey(firstChapter.sections[0]?.section_key ?? "");
    }
  }, [chapters, activeChapterKey]);

  useEffect(() => {
    if (activeSections.length === 0) {
      setActiveSectionKey("");
      return;
    }

    const currentExists = activeSections.some((section) => section.section_key === activeSectionKey);

    if (!currentExists) {
      setActiveSectionKey(activeSections[0]?.section_key ?? "");
    }
  }, [activeSections, activeSectionKey]);

  const activeSection = useMemo(() => {
    return activeSections.find((section) => section.section_key === activeSectionKey) ?? null;
  }, [activeSections, activeSectionKey]);

  const handleChapterClick = (chapterKey: string) => {
    setActiveChapterKey(chapterKey);

    const sections = chapters.find((chapter) => chapter.chapter_key === chapterKey)?.sections ?? [];
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    setActiveSectionKey(sorted[0]?.section_key ?? "");
  };

  return (
    <main className="min-h-screen bg-slate-100/80">
      <div className="mx-auto flex max-w-[1680px] flex-col p-4 sm:p-6 lg:h-screen lg:flex-row lg:overflow-hidden lg:p-8">
        <aside className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 p-5 text-slate-100 shadow-sm lg:h-full lg:w-60 lg:overflow-y-auto">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
            <div className="rounded-lg bg-cyan-500/20 p-2">
              <Building2 className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Falcon</p>
              <h1 className="text-sm font-semibold tracking-wide">BI Report</h1>
            </div>
          </div>

          <nav className="space-y-3">
            {chapters.map((chapter) => {
              const selected = activeChapterKey === chapter.chapter_key;

              return (
                <div key={chapter.chapter_key} className="rounded-xl border border-slate-800 bg-slate-900/80">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                      selected ? "bg-cyan-700 text-white" : "text-slate-200 hover:bg-slate-800 hover:text-white"
                    }`}
                    onClick={() => handleChapterClick(chapter.chapter_key)}
                  >
                    <BookMarked className="h-4 w-4" />
                    <span>{chapter.title}</span>
                  </button>

                  <div className="px-2 pb-2">
                    {chapter.sections.map((section) => {
                      const subSelected =
                        selected && activeSectionKey === section.section_key;
                      const sectionButtonKey = `${chapter.chapter_key}-${section.section_key}-${section.order}`;

                      return (
                        <button
                          key={sectionButtonKey}
                          type="button"
                          className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                            subSelected
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-200 hover:bg-slate-800 hover:text-white"
                          }`}
                          onClick={() => {
                            setActiveChapterKey(chapter.chapter_key);
                            setActiveSectionKey(section.section_key);
                          }}
                        >
                          <span>{section.title}</span>
                          <ChevronRight className={`h-3.5 w-3.5 ${subSelected ? "text-slate-700" : "text-slate-500"}`} />
                        </button>
                      );
                    })}

                    {chapter.sections.length === 0 && (
                      <p className="mt-2 px-3 py-2 text-xs text-slate-400">No sections</p>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <section className="mt-4 flex-1 lg:mt-0 lg:ml-6 lg:h-full lg:overflow-y-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Report ID: {reportId}</p>
              <Link href="/reports" className="text-xs font-medium text-cyan-700 transition hover:text-cyan-800">
                Back to Reports
              </Link>
            </div>

            {isLoading && <p className="text-sm text-slate-600">Loading reports...</p>}

            {!isLoading && error && <p className="text-sm text-red-600">{error}</p>}

            {!isLoading && !error && report && activeChapter && activeSection && (
              <>
                <header className="mb-5 border-b border-slate-200 pb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {report.name}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">{activeChapter.title}</h2>
                  <p className="mt-1 text-base text-slate-600">{activeSection.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>Chapter Key: {activeChapter.chapter_key}</span>
                    <span className="text-slate-300">|</span>
                    <span>Section Key: {activeSection.section_key}</span>
                    <span className="text-slate-300">|</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_STYLES[activeSection.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {activeSection.status}
                    </span>
                  </div>
                </header>

                <ReportSectionCharts section={activeSection} />
              </>
            )}

            {!isLoading && !error && report && !activeSection && (
              <p className="text-sm text-slate-600">No content available for this menu selection.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
