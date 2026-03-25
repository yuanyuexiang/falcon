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

export interface ReportChart {
  chart_id: string;
  chart_type: "line" | "table" | string;
  title: string;
  subtitle: string | null;
  data?: LineChartData | TableChartData;
  echarts?: {
    xAxis?: {
      type?: string;
      data?: Array<string | number>;
    };
    yAxis?: {
      type?: string;
      name?: string;
      min?: number | null;
      max?: number | null;
    };
    series?: Array<{
      name: string;
      type: string;
      data: Array<number | null>;
      smooth?: boolean;
      connectNulls?: boolean;
      symbolSize?: number;
      lineStyle?: {
        color?: string;
        width?: number;
        type?: string;
      };
      itemStyle?: {
        color?: string;
      };
    }>;
  };
  table?: {
    columns: Array<{
      key: string;
      title: string;
      align?: "left" | "center" | "right";
    }>;
    rows: Array<Record<string, string | number | null>>;
  };
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
  title: string;
  subtitle: string | null;
  status: string;
  order: number;
  content: string | null;
  content_items: SectionContentItems;
}

export interface ReportChapter {
  chapter_key: string;
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

export interface BackendReportEnvelope {
  code: number;
  message: string;
  data?: {
    payload?: ReportDocument;
  };
  error?: unknown;
}