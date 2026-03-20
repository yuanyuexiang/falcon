-- Report pipeline base schema for PostgreSQL
-- First version: extraction + metric + assembly contracts

create schema if not exists rpt;

create table if not exists rpt.run_batch (
  run_id bigserial primary key,
  report_key text not null,
  trigger_source text not null default 'manual',
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  created_by text
);

create table if not exists rpt.metric_series_points (
  id bigserial primary key,
  run_id bigint not null references rpt.run_batch(run_id) on delete cascade,
  report_key text not null,
  section_key text not null,
  chart_id text not null,
  metric_name text,
  formatter text,
  series_name text not null,
  point_time date not null,
  metric_value numeric,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_metric_series_points
on rpt.metric_series_points (run_id, report_key, section_key, chart_id, series_name, point_time);

create index if not exists idx_metric_series_points_lookup
on rpt.metric_series_points (report_key, section_key, chart_id, series_name, point_time);

create table if not exists rpt.report_payload (
  id bigserial primary key,
  run_id bigint not null references rpt.run_batch(run_id) on delete cascade,
  report_key text not null,
  payload jsonb not null,
  payload_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_payload_run
on rpt.report_payload (run_id, report_key);
