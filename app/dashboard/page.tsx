"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Building2, ChevronRight } from "lucide-react";

import { ReportSectionCharts } from "@/components/charts/ReportCharts";
import { useSectionDetailQuery } from "@/services/reportHooks";
import { fetchReport } from "@/services/reports";
import type { LineChartData, ReportChapter, ReportChart, ReportDocument, ReportSection } from "@/types/reports";

const ALL_FILTER = "All";

interface SectionFilterOptions {
  filter1Values: string[];
  filter2ByFilter1: Record<string, string[]>;
}

interface SectionFilterLabels {
  filter1Label: string;
  filter2Label: string;
}

interface SharedLegendItem {
  label: string;
  color: string;
}

type EchartsSeriesItem = NonNullable<NonNullable<ReportChart["echarts"]>["series"]>[number];

const SHARED_LEGEND_COLORS = ["#00B7FF", "#33D1FF", "#2D7BFF", "#00D084", "#F5B700", "#FF4D57"];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toFilterValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function appendUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function isAllOption(value: string): boolean {
  return value.trim().toLowerCase() === ALL_FILTER.toLowerCase();
}

function extractSectionFilterOptions(section: ReportSection | null): SectionFilterOptions {
  if (!section) {
    return { filter1Values: [], filter2ByFilter1: { [ALL_FILTER]: [] } };
  }

  const filter1Values: string[] = [];
  const filter2All: string[] = [];
  const filter2ByFilter1: Record<string, string[]> = { [ALL_FILTER]: filter2All };

  const addPair = (filter1Raw: unknown, filter2Raw: unknown) => {
    const filter1 = toFilterValue(filter1Raw);
    const filter2 = toFilterValue(filter2Raw);

    if (filter1 && !isAllOption(filter1)) {
      appendUnique(filter1Values, filter1);
    }

    if (filter2 && !isAllOption(filter2)) {
      appendUnique(filter2All, filter2);
    }

    if (filter1 && filter2 && !isAllOption(filter1) && !isAllOption(filter2)) {
      const list = filter2ByFilter1[filter1] ?? [];
      appendUnique(list, filter2);
      filter2ByFilter1[filter1] = list;
    }
  };

  const addFilterObject = (source: Record<string, unknown>) => {
    const filter1Array = source.filter1;
    const filter2Array = source.filter2;

    if (Array.isArray(filter1Array)) {
      filter1Array.forEach((item) => {
        const value = toFilterValue(item);
        if (value && !isAllOption(value)) {
          appendUnique(filter1Values, value);
        }
      });
    }

    if (Array.isArray(filter2Array)) {
      filter2Array.forEach((item) => {
        const value = toFilterValue(item);
        if (value && !isAllOption(value)) {
          appendUnique(filter2All, value);
        }
      });
    }

    const options = source.options;

    if (Array.isArray(options)) {
      options.forEach((item) => {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          addPair(row.filter1, row.filter2);
        }
      });
    }
  };

  asArray<ReportChart>(section.content_items?.charts).forEach((chart) => {
    const chartMeta = chart.meta as Record<string, unknown> | undefined;

    if (!chartMeta) {
      return;
    }

    const rawFilters = chartMeta.filters;

    if (rawFilters && typeof rawFilters === "object" && !Array.isArray(rawFilters)) {
      addFilterObject(rawFilters as Record<string, unknown>);
    }

    if (Array.isArray(rawFilters)) {
      rawFilters.forEach((item) => {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          addPair(row.filter1, row.filter2);
        }
      });
    }

    const sourceRows = chartMeta.source_rows;

    if (Array.isArray(sourceRows)) {
      sourceRows.forEach((item) => {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          addPair(row.filter1, row.filter2);
        }
      });
    }
  });

  return {
    filter1Values,
    filter2ByFilter1,
  };
}

function extractSectionFilterLabels(section: ReportSection | null): SectionFilterLabels {
  if (!section) {
    return { filter1Label: "Filter 1", filter2Label: "Filter 2" };
  }

  for (const chart of asArray<ReportChart>(section.content_items?.charts)) {
    const chartMeta = chart.meta as Record<string, unknown> | undefined;
    if (!chartMeta || typeof chartMeta !== "object") {
      continue;
    }

    const labels = chartMeta.filter_labels;
    if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
      continue;
    }

    const filter1 = toFilterValue((labels as Record<string, unknown>).filter1);
    const filter2 = toFilterValue((labels as Record<string, unknown>).filter2);

    if (filter1 || filter2) {
      return {
        filter1Label: filter1 || "Filter 1",
        filter2Label: filter2 || "Filter 2",
      };
    }
  }

  return { filter1Label: "Filter 1", filter2Label: "Filter 2" };
}

function normalizeChapters(report: ReportDocument | null): ReportChapter[] {
  if (!report) {
    return [];
  }

  const reportChapters = asArray<ReportChapter>(report.chapters);

  if (reportChapters.length > 0) {
    return [...reportChapters]
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        ...chapter,
        sections: [...asArray<ReportSection>(chapter.sections)].sort((a, b) => a.order - b.order),
      }));
  }

  const fallbackSections = [...asArray<ReportSection>(report.sections)].sort((a, b) => a.order - b.order);

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

function isChapterKeyLabel(value: string): boolean {
  return /^chapter[_-]?\d+$/i.test(value.trim());
}

function getChapterDisplayTitle(chapter: ReportChapter): string {
  const chapterNameFromSection = asArray<ReportSection>(chapter.sections)
    .map((section) => section.chapter_name?.trim() ?? "")
    .find((name) => name.length > 0);
  const chapterName = chapter.chapter_name?.trim() ?? chapterNameFromSection ?? "";

  if (chapterName.length > 0) {
    return chapterName;
  }

  const chapterTitle = chapter.title?.trim() ?? "";
  const firstSectionTitle = asArray<ReportSection>(chapter.sections)
    .map((section) => section.title?.trim() ?? "")
    .find((title) => title.length > 0);

  if ((chapterTitle.length === 0 || chapterTitle === chapter.chapter_key || isChapterKeyLabel(chapterTitle)) && firstSectionTitle) {
    return firstSectionTitle;
  }

  return chapterTitle || chapter.subtitle?.trim() || chapter.chapter_key;
}

function getSectionDisplayTitle(section: ReportSection): string {
  return section.section_name?.trim() || section.subtitle?.trim() || section.title?.trim() || section.section_key;
}

function isLineChart(chart: ReportChart): boolean {
  return chart.chart_type === "line";
}

function asLineChartData(data: ReportChart["data"]): LineChartData {
  return data as LineChartData;
}

function extractSharedLegendItems(section: ReportSection | null): SharedLegendItem[] {
  if (!section) {
    return [];
  }

  const lineCharts = asArray<ReportChart>(section.content_items?.charts).filter((chart) => isLineChart(chart));

  if (lineCharts.length <= 1) {
    return [];
  }

  const legendMap = new Map<string, string>();

  lineCharts.forEach((chart) => {
    const echartsSeries = asArray<EchartsSeriesItem>(chart.echarts?.series);

    if (echartsSeries.length > 0) {
      echartsSeries.forEach((series, index) => {
        if (!series.name || legendMap.has(series.name)) {
          return;
        }

        legendMap.set(
          series.name,
          series.lineStyle?.color ?? series.itemStyle?.color ?? SHARED_LEGEND_COLORS[index % SHARED_LEGEND_COLORS.length],
        );
      });
      return;
    }

    if (chart.data) {
      const lineData = asLineChartData(chart.data);
      const datasets = asArray<LineChartData["datasets"][number]>(lineData.datasets);

      datasets.forEach((dataset, index) => {
        if (!dataset.label || legendMap.has(dataset.label)) {
          return;
        }

        legendMap.set(
          dataset.label,
          dataset.borderColor ?? dataset.backgroundColor ?? SHARED_LEGEND_COLORS[index % SHARED_LEGEND_COLORS.length],
        );
      });
    }
  });

  const items: SharedLegendItem[] = [];
  legendMap.forEach((color, label) => {
    items.push({ label, color });
  });
  return items;
}

export default function DashboardPage() {
  const [reportId, setReportId] = useState<string>("test");
  const [report, setReport] = useState<ReportDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeChapterKey, setActiveChapterKey] = useState<string>("");
  const [activeSectionKey, setActiveSectionKey] = useState<string>("");
  const [selectedFilter1, setSelectedFilter1] = useState<string>(ALL_FILTER);
  const [selectedFilter2, setSelectedFilter2] = useState<string>(ALL_FILTER);

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

    return [...asArray<ReportSection>(activeChapter.sections)].sort((a, b) => a.order - b.order);
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

  const sectionFilterOptions = useMemo(
    () => extractSectionFilterOptions(activeSection),
    [activeSection],
  );
  const sectionFilterLabels = useMemo(
    () => extractSectionFilterLabels(activeSection),
    [activeSection],
  );

  const filter2Candidates = useMemo(() => {
    if (selectedFilter1 === ALL_FILTER) {
      return sectionFilterOptions.filter2ByFilter1[ALL_FILTER] ?? [];
    }

    return sectionFilterOptions.filter2ByFilter1[selectedFilter1] ?? [];
  }, [sectionFilterOptions.filter2ByFilter1, selectedFilter1]);

  useEffect(() => {
    if (selectedFilter2 === ALL_FILTER) {
      return;
    }

    if (!filter2Candidates.includes(selectedFilter2)) {
      setSelectedFilter2(ALL_FILTER);
    }
  }, [filter2Candidates, selectedFilter2]);

  useEffect(() => {
    setSelectedFilter1(ALL_FILTER);
    setSelectedFilter2(ALL_FILTER);
  }, [activeSectionKey, reportId]);

  const {
    data: filteredSection,
    isFetching: isSectionFiltering,
    error: sectionFilterError,
  } = useSectionDetailQuery(
    reportId,
    activeSection?.chapter_key ?? activeChapterKey,
    activeSectionKey,
    {
      filter1: selectedFilter1,
      filter2: selectedFilter2,
    },
    Boolean(reportId && (activeSection?.chapter_key ?? activeChapterKey) && activeSectionKey && activeSection),
  );

  const displaySection = filteredSection ?? activeSection;
  const sharedLegendItems = useMemo(() => extractSharedLegendItems(displaySection), [displaySection]);
  const useSharedLegend = sharedLegendItems.length > 0;
  const [sharedLegendSelectionBySection, setSharedLegendSelectionBySection] = useState<Record<string, Record<string, boolean>>>({});
  const sectionLegendScope = `${reportId}:${displaySection?.section_key ?? activeSectionKey ?? ""}`;
  const sharedLegendSelection = sharedLegendSelectionBySection[sectionLegendScope] ?? {};

  const visibleSharedLegendCount = useMemo(() => {
    return sharedLegendItems.filter((item) => sharedLegendSelection[item.label] ?? true).length;
  }, [sharedLegendItems, sharedLegendSelection]);

  const hiddenSeriesNames = useMemo(() => {
    if (!useSharedLegend) {
      return new Set<string>();
    }

    return new Set(
      sharedLegendItems
        .filter((item) => !(sharedLegendSelection[item.label] ?? true))
        .map((item) => item.label),
    );
  }, [sharedLegendItems, sharedLegendSelection, useSharedLegend]);

  const toggleSharedLegendItem = (label: string) => {
    setSharedLegendSelectionBySection((previousBySection) => {
      const previous = previousBySection[sectionLegendScope] ?? {};
      const isVisible = previous[label] ?? true;

      if (isVisible) {
        const visibleCount = sharedLegendItems.filter((item) => previous[item.label] ?? true).length;
        if (visibleCount <= 1) {
          return previousBySection;
        }
      }

      return {
        ...previousBySection,
        [sectionLegendScope]: {
          ...previous,
          [label]: !isVisible,
        },
      };
    });
  };

  const isolateSharedLegendItem = (label: string) => {
    setSharedLegendSelectionBySection((previousBySection) => {
      const nextSelection: Record<string, boolean> = {};

      sharedLegendItems.forEach((item) => {
        nextSelection[item.label] = item.label === label;
      });

      return {
        ...previousBySection,
        [sectionLegendScope]: nextSelection,
      };
    });
  };

  const selectAllSharedLegendItems = () => {
    setSharedLegendSelectionBySection((previousBySection) => {
      const nextSelection: Record<string, boolean> = {};

      sharedLegendItems.forEach((item) => {
        nextSelection[item.label] = true;
      });

      return {
        ...previousBySection,
        [sectionLegendScope]: nextSelection,
      };
    });
  };

  const invertSharedLegendItems = () => {
    setSharedLegendSelectionBySection((previousBySection) => {
      const previous = previousBySection[sectionLegendScope] ?? {};
      const nextSelection: Record<string, boolean> = {};

      sharedLegendItems.forEach((item) => {
        nextSelection[item.label] = !(previous[item.label] ?? true);
      });

      return {
        ...previousBySection,
        [sectionLegendScope]: nextSelection,
      };
    });
  };

  const handleChapterClick = (chapterKey: string) => {
    setActiveChapterKey(chapterKey);

    const sections = asArray<ReportSection>(chapters.find((chapter) => chapter.chapter_key === chapterKey)?.sections);
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    setActiveSectionKey(sorted[0]?.section_key ?? "");
  };

  return (
    <main className="terminal-gridline min-h-screen">
      <div className="mx-auto flex max-w-[1680px] flex-col p-4 sm:p-6 lg:h-screen lg:flex-row lg:overflow-hidden lg:p-8">
        <aside className="terminal-shell no-scrollbar w-full rounded-2xl p-5 text-slate-100 lg:h-full lg:w-80 lg:shrink-0 lg:overflow-y-auto">
          <div className="terminal-panel mb-6 rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 p-2">
              <Building2 className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="terminal-kicker text-xs uppercase">Falcon</p>
              <h1 className="text-sm font-semibold tracking-wide text-cyan-100">BI Report</h1>
            </div>
            </div>
            <div className="mt-3 border-t border-cyan-500/20 pt-2">
              <Link href="/reports" className="text-xs font-medium text-cyan-300 transition hover:text-cyan-100">
                Back to Reports
              </Link>
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
                    <span>{getChapterDisplayTitle(chapter)}</span>
                  </button>

                  <div className="px-2 pb-2">
                    {asArray<ReportSection>(chapter.sections).map((section) => {
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
                            <span>{getSectionDisplayTitle(section)}</span>
                          <ChevronRight className={`h-3.5 w-3.5 ${subSelected ? "text-cyan-200" : "text-slate-500"}`} />
                        </button>
                      );
                    })}

                    {asArray<ReportSection>(chapter.sections).length === 0 && (
                      <p className="mt-2 px-3 py-2 text-xs text-slate-400">No sections</p>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <section className="mt-4 flex-1 lg:mt-0 lg:ml-6 lg:h-full lg:min-h-0 lg:min-w-0">
          <div className="terminal-shell no-scrollbar rounded-2xl px-6 pb-6 pt-0 sm:px-7 sm:pb-7 sm:pt-0 lg:h-full lg:min-h-0 lg:min-w-0 lg:overflow-x-hidden lg:overflow-y-auto">
            <div className="sticky top-0 z-20 -mx-1 mb-2 border-b border-cyan-500/20 bg-[linear-gradient(165deg,rgba(10,16,32,0.96),rgba(8,13,26,0.96))] px-1 pb-2 backdrop-blur-sm">
              <div className="terminal-ticker mb-1.5 rounded-lg py-1 text-[10px] text-slate-200">
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

              {!isLoading && !error && report && activeChapter && displaySection && (
                <header className="space-y-1.5">
                  <div className="grid gap-1.5 lg:grid-cols-[minmax(0,2fr)_minmax(420px,1fr)] lg:items-center">
                    <div className="min-w-0">
                      <p className="terminal-kicker text-xs font-medium uppercase">{report.name}</p>
                      <h2 className="mt-0.5 truncate text-lg font-semibold text-cyan-100">{getChapterDisplayTitle(activeChapter)}</h2>
                      <p className="mt-0 truncate text-xs text-slate-300">{getSectionDisplayTitle(displaySection)}</p>
                    </div>

                    <div className="terminal-panel w-full rounded-lg px-2 py-1.5 lg:ml-auto lg:w-full">
                      <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                        <label className="flex items-center gap-1 text-xs">
                          <span className="whitespace-nowrap text-slate-400">{sectionFilterLabels.filter1Label}</span>
                          <select
                            value={selectedFilter1}
                            onChange={(event) => {
                              const nextFilter1 = event.target.value;
                              setSelectedFilter1(nextFilter1);
                              setSelectedFilter2(ALL_FILTER);
                            }}
                            className="min-w-0 flex-1 rounded-md border border-cyan-500/25 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none transition focus:border-cyan-300"
                          >
                            <option value={ALL_FILTER}>{ALL_FILTER}</option>
                            {sectionFilterOptions.filter1Values.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex items-center gap-1 text-xs">
                          <span className="whitespace-nowrap text-slate-400">{sectionFilterLabels.filter2Label}</span>
                          <select
                            value={selectedFilter2}
                            onChange={(event) => {
                              setSelectedFilter2(event.target.value);
                            }}
                            className="min-w-0 flex-1 rounded-md border border-cyan-500/25 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none transition focus:border-cyan-300"
                          >
                            <option value={ALL_FILTER}>{ALL_FILTER}</option>
                            {filter2Candidates.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFilter1(ALL_FILTER);
                              setSelectedFilter2(ALL_FILTER);
                            }}
                            className="rounded-md border border-cyan-400/35 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                          >
                            Reset Filters
                          </button>
                          {typeof filteredSection?.meta?.filtered_rows_count === "number" && (
                            <p className="text-[11px] text-slate-400">Rows: {filteredSection.meta.filtered_rows_count}</p>
                          )}
                          {isSectionFiltering && <p className="text-[11px] text-cyan-200">Updating...</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {useSharedLegend && (
                    <div className="terminal-panel mt-1.5 rounded-lg px-2.5 py-1.5">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Shared Legend</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllSharedLegendItems}
                            className="rounded border border-cyan-400/35 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-100 transition hover:bg-cyan-500/20"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={invertSharedLegendItems}
                            className="rounded border border-slate-500/40 bg-slate-700/30 px-1.5 py-0.5 text-[10px] text-slate-200 transition hover:bg-slate-700/45"
                          >
                            Invert
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {sharedLegendItems.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => toggleSharedLegendItem(item.label)}
                            onDoubleClick={() => isolateSharedLegendItem(item.label)}
                            title="Click: toggle series, double-click: isolate series (at least one series stays visible)"
                            className={`flex items-center gap-1.5 text-[11px] transition ${
                              sharedLegendSelection[item.label] ?? true
                                ? visibleSharedLegendCount === 1
                                  ? "cursor-not-allowed text-slate-300"
                                  : "cursor-pointer text-slate-200"
                                : "cursor-pointer text-slate-500"
                            }`}
                          >
                            <span
                              className="inline-block h-0.5 w-5"
                              style={{
                                backgroundColor: item.color,
                                opacity: sharedLegendSelection[item.label] ?? true ? 1 : 0.35,
                              }}
                            />
                            <span className={sharedLegendSelection[item.label] ?? true ? "" : "line-through"}>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </header>
              )}
            </div>

            {isLoading && <p className="text-sm text-slate-300">Loading reports...</p>}

            {!isLoading && error && <p className="text-sm text-red-300">{error}</p>}

            {!isLoading && !error && report && activeChapter && displaySection && (
              <ReportSectionCharts
                section={displaySection}
                sharedLegendEnabled={useSharedLegend}
                hiddenSeriesNames={hiddenSeriesNames}
              />
            )}

            {!isLoading && !error && report && !displaySection && (
              <p className="text-sm text-slate-300">No content available for this menu selection.</p>
            )}

            {!!sectionFilterError && (
              <p className="mt-3 text-xs text-amber-200">
                Filter API failed, fallback to base section data.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
