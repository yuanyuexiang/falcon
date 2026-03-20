import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const sourceFiles = ["rpt_analytics.json", "rpt_platform.json", "rpt_financial.json"];
const keepRaw = process.argv.includes("--keep-raw");

const defaultPalette = ["#0B3C5D", "#1D70A2", "#2AA198", "#6B7280", "#E76F51", "#3C6E71"];

function inferAlign(header, columnValues) {
  if (/date/i.test(header)) {
    return "center";
  }

  if (columnValues.some((value) => typeof value === "number")) {
    return "right";
  }

  return "left";
}

function normalizeLineChart(chart) {
  const labels = chart?.data?.labels ?? [];
  const datasets = chart?.data?.datasets ?? [];

  return {
    chart_id: chart.chart_id,
    chart_type: "line",
    title: chart.title,
    subtitle: chart.subtitle,
    echarts: {
      xAxis: {
        type: "category",
        data: labels,
      },
      yAxis: {
        type: "value",
        name: chart?.config?.y_axis_label ?? "Value",
        min: Array.isArray(chart?.config?.y_axis_range) ? chart.config.y_axis_range[0] : null,
        max: Array.isArray(chart?.config?.y_axis_range) ? chart.config.y_axis_range[1] : null,
      },
      series: datasets.map((dataset, index) => {
        const color = dataset.borderColor ?? dataset.backgroundColor ?? defaultPalette[index % defaultPalette.length];
        const dashed = /management/i.test(dataset.label ?? "");

        return {
          name: dataset.label,
          type: dataset.showLine === false ? "scatter" : "line",
          data: dataset.data ?? [],
          smooth: typeof dataset.tension === "number" ? dataset.tension > 0 : Boolean(chart?.config?.smooth_line),
          connectNulls: dataset.spanGaps ?? true,
          symbolSize: dataset.pointRadius ?? 4,
          lineStyle: {
            color,
            width: dataset.borderWidth ?? 2,
            type: dashed ? "dashed" : "solid",
          },
          itemStyle: {
            color: dataset.pointBackgroundColor ?? color,
          },
        };
      }),
    },
    meta: {
      formatter: chart?.metadata?.formatter ?? null,
      metric_name: chart?.metadata?.metric_name ?? null,
      data_source: chart?.metadata?.data_source ?? null,
      display_precision: 3,
    },
    ...(keepRaw ? { raw_chart: chart } : {}),
  };
}

function normalizeTableChart(chart) {
  const headers = chart?.data?.headers ?? [];
  const rows = chart?.data?.rows ?? [];

  const columns = headers.map((header, index) => {
    const values = rows.map((row) => row[index]);

    return {
      key: `col_${index}`,
      title: header,
      align: inferAlign(header, values),
    };
  });

  const normalizedRows = rows.map((row, rowIndex) => {
    const nextRow = {
      _row_id: `row_${rowIndex + 1}`,
    };

    columns.forEach((column, index) => {
      nextRow[column.key] = row[index] ?? null;
    });

    return nextRow;
  });

  return {
    chart_id: chart.chart_id,
    chart_type: "table",
    title: chart.title,
    subtitle: chart.subtitle,
    table: {
      columns,
      rows: normalizedRows,
    },
    meta: {
      source: chart?.metadata?.source ?? null,
    },
    ...(keepRaw ? { raw_chart: chart } : {}),
  };
}

function normalizeChart(chart) {
  if (chart.chart_type === "line") {
    return normalizeLineChart(chart);
  }

  if (chart.chart_type === "table") {
    return normalizeTableChart(chart);
  }

  return {
    chart_id: chart.chart_id,
    chart_type: chart.chart_type,
    title: chart.title,
    subtitle: chart.subtitle,
    meta: {
      unsupported: true,
    },
    ...(keepRaw ? { raw_chart: chart } : {}),
  };
}

function normalizeReport(report) {
  return {
    id: report.id,
    name: report.name,
    type: report.type,
    project_id: report.project_id,
    status: report.status,
    sections: (report.sections ?? []).map((section) => {
      const charts = section?.content_items?.charts ?? [];

      return {
        id: section.id,
        section_key: section.section_key,
        title: section.title,
        subtitle: section.subtitle,
        status: section.status,
        order: section.order,
        content: section.content,
        content_items: {
          charts: charts.map(normalizeChart),
          kind: section?.content_items?.kind ?? null,
          items: section?.content_items?.items ?? null,
        },
      };
    }),
  };
}

for (const fileName of sourceFiles) {
  const sourcePath = path.join(workspaceRoot, "data", fileName);
  const outputName = fileName.replace(/\.json$/i, ".echarts.json");
  const outputPath = path.join(workspaceRoot, "data", "echarts", outputName);

  const sourceRaw = fs.readFileSync(sourcePath, "utf8");
  const report = JSON.parse(sourceRaw);
  const normalized = normalizeReport(report);

  fs.writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  console.log(`Converted: ${sourcePath}`);
  console.log(`Output: ${outputPath}`);
}

console.log(`keepRaw: ${keepRaw}`);
