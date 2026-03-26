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
    <main className="terminal-gridline min-h-screen">
      <div className="mx-auto flex max-w-[1680px] flex-col p-4 sm:p-6 lg:h-screen lg:flex-row lg:overflow-hidden lg:p-8">
        <aside className="terminal-shell w-full rounded-2xl p-5 text-slate-100 lg:h-full lg:w-60 lg:shrink-0 lg:overflow-y-auto">
          <div className="terminal-panel mb-6 flex items-center gap-3 rounded-xl px-3 py-3">
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 p-2">
              <Building2 className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="terminal-kicker text-xs uppercase">Falcon</p>
              <h1 className="text-sm font-semibold tracking-wide text-cyan-100">BI Report</h1>
            </div>
          </div>

          <nav className="space-y-3">
            {chapters.map((chapter) => {
              const selected = activeChapterKey === chapter.chapter_key;

              return (
                <div key={chapter.chapter_key} className="terminal-panel rounded-xl">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                      selected
                        ? "border border-cyan-300/40 bg-cyan-500/20 text-cyan-100"
                        : "text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-100"
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
                              ? "bg-cyan-500/20 text-cyan-100"
                              : "text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-100"
                          }`}
                          onClick={() => {
                            setActiveChapterKey(chapter.chapter_key);
                            setActiveSectionKey(section.section_key);
                          }}
                        >
                          <span>{section.title}</span>
                          <ChevronRight className={`h-3.5 w-3.5 ${subSelected ? "text-cyan-200" : "text-slate-500"}`} />
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

        <section className="mt-4 flex-1 lg:mt-0 lg:ml-6 lg:h-full lg:min-h-0 lg:min-w-0">
          <div className="terminal-shell rounded-2xl p-6 sm:p-7 lg:h-full lg:min-h-0 lg:min-w-0 lg:overflow-x-hidden lg:overflow-y-auto">
            <div className="sticky top-0 z-20 -mx-1 mb-4 border-b border-cyan-500/20 bg-[linear-gradient(165deg,rgba(10,16,32,0.96),rgba(8,13,26,0.96))] px-1 pb-4 backdrop-blur-sm">
              <div className="terminal-ticker mb-4 rounded-lg py-2 text-xs text-slate-200">
                <div className="terminal-ticker-track">
                  <div className="flex items-center gap-6 px-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="terminal-live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      TERMINAL LIVE
                    </span>
                    <span className="text-cyan-200">REPORT: {reportId.toUpperCase()}</span>
                    <span>CHAPTERS NAVIGATION ONLINE</span>
                    <span className="text-emerald-300">STREAM SYNCED</span>
                    <span>MODEL: CREDIT BEHAVIOR INSIGHT</span>
                    <span className="text-red-300">RISK WATCH ENABLED</span>
                  </div>
                  <div className="flex items-center gap-6 px-4" aria-hidden="true">
                    <span className="inline-flex items-center gap-2">
                      <span className="terminal-live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      TERMINAL LIVE
                    </span>
                    <span className="text-cyan-200">REPORT: {reportId.toUpperCase()}</span>
                    <span>CHAPTERS NAVIGATION ONLINE</span>
                    <span className="text-emerald-300">STREAM SYNCED</span>
                    <span>MODEL: CREDIT BEHAVIOR INSIGHT</span>
                    <span className="text-red-300">RISK WATCH ENABLED</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                <p className="terminal-kicker text-xs font-medium uppercase">Report ID: {reportId}</p>
                <Link href="/reports" className="text-xs font-medium text-cyan-300 transition hover:text-cyan-100">
                  Back to Reports
                </Link>
              </div>

              {!isLoading && !error && report && activeChapter && activeSection && (
                <header>
                  <p className="terminal-kicker text-xs font-medium uppercase">{report.name}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-cyan-100">{activeChapter.title}</h2>
                  <p className="mt-1 text-base text-slate-300">{activeSection.title}</p>
                </header>
              )}
            </div>

            {isLoading && <p className="text-sm text-slate-300">Loading reports...</p>}

            {!isLoading && error && <p className="text-sm text-red-300">{error}</p>}

            {!isLoading && !error && report && activeChapter && activeSection && (
              <ReportSectionCharts section={activeSection} />
            )}

            {!isLoading && !error && report && !activeSection && (
              <p className="text-sm text-slate-300">No content available for this menu selection.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
