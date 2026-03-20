-- Analytics metric output contract (template)
-- Replace source table and filters with real business schema.

-- Example unified output contract:
-- report_key, section_key, chart_id, metric_name, formatter, series_name, point_time, metric_value

with params as (
  select
    date '2016-01-01' as start_date,
    date '2026-12-31' as end_date
),
source_data as (
  -- TODO: replace with your real table
  select
    biz_date,
    segment_name as series_name,
    orig_balance_k,
    avg_orig_balance_k,
    term_months,
    interest_rate,
    apr,
    fico_score,
    pti_ratio,
    dti_ratio,
    annual_income_k,
    debt_consolidation_pct,
    existing_borrower_pct,
    grade_1_pct
  from your_schema.your_table
)
select
  'data-analytics'::text as report_key,
  'origination_trends'::text as section_key,
  x.chart_id,
  x.metric_name,
  x.formatter,
  d.series_name,
  date_trunc('month', d.biz_date)::date as point_time,
  x.metric_value
from source_data d
cross join lateral (
  values
    ('orig_1',  'Orig_Bal',                'thousands',  d.orig_balance_k::numeric),
    ('orig_2',  'Avg_Orig_Bal',            'thousands',  d.avg_orig_balance_k::numeric),
    ('orig_3',  'Term',                    'decimal',    d.term_months::numeric),
    ('orig_4',  'IR',                      'percentage', d.interest_rate::numeric),
    ('orig_5',  'APR',                     'percentage', d.apr::numeric),
    ('orig_6',  'FICO',                    'decimal',    d.fico_score::numeric),
    ('orig_7',  'PTI',                     'percentage', d.pti_ratio::numeric),
    ('orig_8',  'DTI',                     'percentage', d.dti_ratio::numeric),
    ('orig_9',  'Annual_Inc',              'thousands',  d.annual_income_k::numeric),
    ('orig_10', 'Debt_Consolidation_Pct',  'percentage', d.debt_consolidation_pct::numeric),
    ('orig_11', 'Existing_Borrower_Pct',   'percentage', d.existing_borrower_pct::numeric),
    ('orig_12', 'Grade_1_Pct',             'percentage', d.grade_1_pct::numeric)
) as x(chart_id, metric_name, formatter, metric_value)
join params p on d.biz_date between p.start_date and p.end_date;
