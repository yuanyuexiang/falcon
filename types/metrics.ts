export interface MetricPoint {
  vintage_month: string;
  Metrics: string;
  Value: number;
}

export interface MetricsResponse {
  metrics: string[];
  grouped: Record<string, MetricPoint[]>;
}
