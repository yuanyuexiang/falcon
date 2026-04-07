export interface TextBlockItem {
  type: string;
  text: string;
}

export interface ChartDataset {
  label: string;
  data: Array<number | null>;
  borderColor?: string;
  backgroundColor?: string;
  borderWidth?: number;
  pointRadius?: number;
  pointBackgroundColor?: string;
  showLine?: boolean;
  tension?: number;
  spanGaps?: boolean;
}

export interface LineChartData {
  labels: Array<string | number>;
  datasets: ChartDataset[];
}

export interface TableChartData {
  headers: string[];
  rows: Array<Array<string | number | null>>;
}

export interface TableColumn {
  key: string;
  title: string;
  align?: "left" | "center" | "right";
}

export interface TableObjectData {
  columns: TableColumn[];
  rows: Array<Record<string, string | number | null>>;
  presentation?: {
    cell_styles?: Array<{
      row_index: number;
      column: string;
      tokens: string[];
    }>;
    header_groups?: Array<{
      group_name: string;
      start_col: string;
      end_col: string;
      bg_color?: string;
      font_color?: string;
    }>;
  };
}

export interface ReportChart {
  chart_id: string;
  chart_type: "line" | "table" | string;
  title: string;
  subtitle: string | null;
  data?: LineChartData | TableChartData;
  table_data?: TableObjectData;
  echarts?: {
    [key: string]: unknown;
    xAxis?: {
      type?: string;
      data?: Array<string | number>;
      [key: string]: unknown;
    };
    yAxis?: {
      type?: string;
      name?: string;
      min?: number | null;
      max?: number | null;
      [key: string]: unknown;
    };
    markArea?: Record<string, unknown>;
    markLine?: Record<string, unknown>;
    graphic?: unknown;
    legend?: Record<string, unknown>;
    tooltip?: Record<string, unknown>;
    grid?: Record<string, unknown>;
    series?: Array<{
      [key: string]: unknown;
      name: string;
      type: string;
      data: Array<number | null | [string | number, number | null] | Record<string, unknown>>;
      smooth?: boolean;
      connectNulls?: boolean;
      symbolSize?: number;
      lineStyle?: {
        color?: string;
        width?: number;
        type?: string;
        [key: string]: unknown;
      };
      itemStyle?: {
        color?: string;
        [key: string]: unknown;
      };
    }>;
  };
  table?: TableObjectData;
  config?: {
    y_axis_label?: string;
    y_axis_range?: number[];
    smooth_line?: boolean;
    show_legend?: boolean;
    [key: string]: unknown;
  };
  meta?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SectionContentItems {
  charts?: ReportChart[];
  kind?: string | null;
  section_key?: string;
  items?: TextBlockItem[] | null;
}

export interface ReportSection {
  id?: string;
  section_key: string;
  chapter_key?: string;
  chapter_name?: string | null;
  section_name?: string | null;
  title: string;
  subtitle: string | null;
  status: string;
  order: number;
  content: string | null;
  content_items: SectionContentItems;
  meta?: {
    selected_filters?: SectionFilterParams;
    filtered_rows_count?: number;
    [key: string]: unknown;
  };
}

export interface ReportChapter {
  chapter_key: string;
  chapter_name?: string | null;
  title: string;
  subtitle: string | null;
  order: number;
  status: string;
  sections: ReportSection[];
}

export interface ReportDocument {
  id: string;
  report_key?: string;
  name: string;
  type: string;
  project_id?: string;
  status: string;
  sections?: ReportSection[];
  chapters?: ReportChapter[];
}

export interface ReportApiResponse {
  report: ReportDocument;
}

export interface SectionFilterParams {
  filter1?: string;
  filter2?: string;
}

export interface SectionDetailApiResponse {
  section: ReportSection;
}

export interface ReportListItem {
  id: string;
  report_key: string;
  name: string;
  type: string;
  status: string;
  [key: string]: unknown;
}

export interface ReportListApiResponse {
  reports: ReportListItem[];
}

export interface BackendReportEnvelope {
  code: number;
  message: string;
  data?: {
    payload?: ReportDocument;
  };
  error?: unknown;
}