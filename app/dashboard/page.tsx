"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, ChartSpline, ChevronRight, CircleDollarSign, LayoutDashboard } from "lucide-react";

import { ReportSectionCharts } from "@/components/charts/ReportCharts";
import { fetchReport } from "@/services/reports";
import type { ReportDocument, ReportMenuKey, ReportSection } from "@/types/reports";

interface MenuConfig {
  key: ReportMenuKey;
  label: string;
  icon: LucideIcon;
}

const MENUS: MenuConfig[] = [
  {
    key: "platform-overview",
    label: "Platform Overview",
    icon: LayoutDashboard,
  },
  {
    key: "data-analytics",
    label: "Data Analytics",
    icon: ChartSpline,
  },
  {
    key: "pricing-scenario",
    label: "Pricing & Scenario",
    icon: CircleDollarSign,
  },
];

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-700",
};

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
    <main className="min-h-screen bg-slate-100/80">
      <div className="mx-auto flex max-w-[1680px] flex-col p-4 sm:p-6 lg:h-screen lg:flex-row lg:overflow-hidden lg:p-8">
        <aside className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 p-5 text-slate-100 shadow-sm lg:h-full lg:w-80 lg:overflow-y-auto">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
            <div className="rounded-lg bg-cyan-500/20 p-2">
              <Building2 className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Falcon</p>
              <h1 className="text-sm font-semibold tracking-wide">BI Report Manager</h1>
            </div>
          </div>

          <nav className="space-y-3">
            {MENUS.map((menu) => {
              const menuReport = reports[menu.key];
              const menuSections = [...(menuReport?.sections ?? [])].sort((a, b) => a.order - b.order);
              const selected = activeMenu === menu.key;
              const Icon = menu.icon;

              return (
                <div key={menu.key} className="rounded-xl border border-slate-800 bg-slate-900/80">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                      selected ? "bg-cyan-700 text-white" : "text-slate-200 hover:bg-slate-800 hover:text-white"
                    }`}
                    onClick={() => handleMainMenuClick(menu.key)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{menu.label}</span>
                  </button>

                  <div className="px-2 pb-2">
                    {menuSections.map((section) => {
                      const subSelected = selected && activeSectionKey === section.section_key;

                      return (
                        <button
                          key={section.id}
                          type="button"
                          className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                            subSelected
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-200 hover:bg-slate-800 hover:text-white"
                          }`}
                          onClick={() => {
                            setActiveMenu(menu.key);
                            setActiveSectionKey(section.section_key);
                          }}
                        >
                          <span>{section.title}</span>
                          <ChevronRight className={`h-3.5 w-3.5 ${subSelected ? "text-slate-700" : "text-slate-500"}`} />
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            {isLoading && <p className="text-sm text-slate-600">Loading reports...</p>}

            {!isLoading && error && <p className="text-sm text-red-600">{error}</p>}

            {!isLoading && !error && activeReport && activeSection && (
              <>
                <header className="mb-5 border-b border-slate-200 pb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {activeReport.name}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">{activeSection.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
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

            {!isLoading && !error && activeReport && !activeSection && (
              <p className="text-sm text-slate-600">当前菜单暂无可展示内容。</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
