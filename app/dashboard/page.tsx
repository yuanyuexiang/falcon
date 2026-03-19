"use client";

import { useEffect, useMemo, useState } from "react";

import { ReportSectionCharts } from "@/components/charts/ReportCharts";
import { fetchReport } from "@/services/reports";
import type { ReportDocument, ReportMenuKey, ReportSection } from "@/types/reports";

interface MenuConfig {
  key: ReportMenuKey;
  label: string;
}

const MENUS: MenuConfig[] = [
  {
    key: "platform-overview",
    label: "Platform Overview",
  },
  {
    key: "data-analytics",
    label: "Data Analytics",
  },
  {
    key: "pricing-scenario",
    label: "Pricing & Scenario",
  },
];

export default function DashboardPage() {
  const [reports, setReports] = useState<Partial<Record<ReportMenuKey, ReportDocument>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeMenu, setActiveMenu] = useState<ReportMenuKey>("platform-overview");
  const [activeSectionKey, setActiveSectionKey] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setIsLoading(true);

        const result = await Promise.all(
          MENUS.map(async (menu) => {
            const report = await fetchReport(menu.key);
            return [menu.key, report] as const;
          }),
        );

        if (!mounted) {
          return;
        }

        const nextReports = result.reduce<Partial<Record<ReportMenuKey, ReportDocument>>>(
          (accumulator, [menuKey, report]) => {
            accumulator[menuKey] = report;
            return accumulator;
          },
          {},
        );

        setReports(nextReports);
        setError("");
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "加载报表失败");
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
  }, []);

  const activeReport = reports[activeMenu];

  const activeSections = useMemo(() => {
    if (!activeReport) {
      return [] as ReportSection[];
    }

    return [...activeReport.sections].sort((a, b) => a.order - b.order);
  }, [activeReport]);

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

  const handleMainMenuClick = (menuKey: ReportMenuKey) => {
    setActiveMenu(menuKey);

    const sections = reports[menuKey]?.sections ?? [];
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    setActiveSectionKey(sorted[0]?.section_key ?? "");
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-[1680px] flex-col p-4 sm:p-6 lg:h-screen lg:flex-row lg:overflow-hidden lg:p-8">
        <aside className="w-full rounded-2xl border border-slate-200 bg-slate-900 p-4 text-slate-100 shadow-lg lg:h-full lg:w-80 lg:overflow-y-auto">
          <h1 className="mb-6 text-lg font-semibold tracking-wide">BI Report Manager</h1>

          <nav className="space-y-3">
            {MENUS.map((menu) => {
              const menuReport = reports[menu.key];
              const menuSections = [...(menuReport?.sections ?? [])].sort((a, b) => a.order - b.order);
              const selected = activeMenu === menu.key;

              return (
                <div key={menu.key} className="rounded-xl border border-slate-700 bg-slate-800/80">
                  <button
                    type="button"
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                      selected ? "bg-sky-700 text-white" : "text-slate-200 hover:bg-slate-700"
                    }`}
                    onClick={() => handleMainMenuClick(menu.key)}
                  >
                    {menu.label}
                  </button>

                  <div className="px-2 pb-2">
                    {menuSections.map((section) => {
                      const subSelected = selected && activeSectionKey === section.section_key;

                      return (
                        <button
                          key={section.id}
                          type="button"
                          className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                            subSelected
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-300 hover:bg-slate-700 hover:text-white"
                          }`}
                          onClick={() => {
                            setActiveMenu(menu.key);
                            setActiveSectionKey(section.section_key);
                          }}
                        >
                          {section.title}
                        </button>
                      );
                    })}

                    {menuSections.length === 0 && (
                      <p className="mt-2 px-3 py-2 text-xs text-slate-400">No sections</p>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <section className="mt-4 flex-1 lg:mt-0 lg:ml-6 lg:h-full lg:overflow-y-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {isLoading && <p className="text-sm text-slate-600">Loading reports...</p>}

            {!isLoading && error && <p className="text-sm text-red-600">{error}</p>}

            {!isLoading && !error && activeReport && activeSection && (
              <>
                <header className="mb-5 border-b border-slate-200 pb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {activeReport.name}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">{activeSection.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Section Key: {activeSection.section_key} · Status: {activeSection.status}
                  </p>
                </header>

                <ReportSectionCharts section={activeSection} />
              </>
            )}

            {!isLoading && !error && activeReport && !activeSection && (
              <p className="text-sm text-slate-600">当前菜单暂无可展示内容。</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
