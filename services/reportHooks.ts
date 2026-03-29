"use client";

import { useQuery } from "@tanstack/react-query";

import { getSectionDetail } from "@/services/reports";
import type { ReportSection, SectionFilterParams } from "@/types/reports";

export function useSectionDetailQuery(
  reportKey: string,
  sectionKey: string,
  filters: SectionFilterParams,
  enabled: boolean,
) {
  return useQuery<ReportSection>({
    queryKey: [
      "section-detail",
      reportKey,
      sectionKey,
      filters.filter1 ?? "All",
      filters.filter2 ?? "All",
    ],
    queryFn: () => getSectionDetail(reportKey, sectionKey, filters),
    enabled,
    staleTime: 15_000,
  });
}
