# BI 报告平台整合方案（唯一版）

## 1. 项目目标

构建一个由 PostgreSQL 驱动的可配置报告平台，替代静态 JSON 人工维护模式，实现：

1. report 结构化配置（report/section/chart/dataset）
2. 数据库抽取与指标计算自动化
3. 渲染快照版本化发布
4. 前端只读已发布快照

## 1.1 MVP 主线（当前版本统一口径）

第一版按最简路径落地：

1. 将 report/section/chart 的属性字段存入数据库。
2. 将图表 dataset 数据存入数据库。
3. 后端按配置与数据组装生成最终报告 JSON。
4. 前端只读取组装后的报告 JSON（快照）。

说明：第一版不做复杂配置编辑器，不做动态权限，不做高级调度编排。

## 2. 统一实体模型

## 2.0 业务语义约定（后端实现口径）

一个报告（report）由多个段落（section）组成。

每个段落（section）由以下部分组成：

1. title（标题）
2. subtitle（子标题）
3. content（内容模板）

其中 content 可以包含多个图表（chart）。

每个图表（chart）至少包含两类信息：

1. echarts option（展示配置）
2. 数据库表数据（按指标口径计算后的序列或表格数据）

后端开发必须遵循以下边界：

1. chart 的 option 与数据结果分开建模，不互相硬编码。
2. section 只负责编排内容，不直接承担指标计算。
3. report 只作为容器，不直接存放图表计算逻辑。
4. 数据计算逻辑下沉到 dataset 与作业流程中。

建议输出契约：

1. report -> sections[]
2. section -> title, subtitle, content_items
3. content_items -> charts[]
4. chart -> chart_id, chart_type, title, subtitle, echarts, table_data/meta

## 2.1 report

作用：报告容器。

核心字段建议：

1. id
2. report_key
3. name
4. type
5. status
6. published_version
7. created_at
8. updated_at

## 2.2 section

作用：报告段落（页面内容分区）。

核心字段建议：

1. id
2. report_id
3. section_key
4. title
5. subtitle
6. order_no
7. layout
8. visible
9. content_template

## 2.3 chart

作用：图表定义与展示配置。

核心字段建议：

1. id
2. section_id
3. chart_key
4. chart_type
5. title
6. subtitle
7. order_no
8. option_template_json
9. dataset_binding_json

## 2.4 dataset

作用：图表绑定的数据源定义。

核心字段建议：

1. id
2. dataset_key
3. source_type
4. query_template
5. params_schema_json
6. metric_name
7. formatter
8. unit
9. precision
10. refresh_policy
11. cache_ttl
12. null_policy
13. timezone

## 2.5 render_snapshot

作用：发布后的可读快照（前端读取对象）。

核心字段建议：

1. id
2. report_id
3. version
4. payload_json
5. payload_hash
6. generated_by_run_id
7. generated_at

## 3. 分层架构

## 3.1 Extract 层

职责：从业务库抽取原子数据。

规则：

1. 不做复杂业务计算
2. 保留原始时间字段
3. 支持全量与增量

## 3.2 Metric 层

职责：统一口径计算指标序列。

统一输出字段：

1. report_key
2. section_key
3. chart_id
4. series_name
5. point_time
6. metric_value
7. formatter

规则：

1. 时间粒度统一（建议 month_end）
2. 缺失值保留 null，不补 0

## 3.3 Assembly 层

职责：将 option 模板与 metric 结果组装为报告 JSON。

规则：

1. 输出结构兼容当前 data/echarts 的协议
2. chart 配置与数据结果解耦
3. 组装完成写入 render_snapshot

组装输入最小集合：

1. report 字段（id、name、type、status）
2. section 字段（title、subtitle、content_template、order）
3. chart 字段（chart_type、title、subtitle、option_template_json）
4. dataset 字段（series、point_time、metric_value）

组装输出：

1. 单个 report 完整 JSON（结构与 `data/echarts/*.echarts.json` 对齐）
2. 写入 render_snapshot 作为前端读取源

## 3.4 Publish 层

职责：版本发布与审计。

规则：

1. 发布前做基础结构检查
2. 发布必须记录操作日志

第一版发布定义：

1. 将本次组装结果标记为当前 published_version。
2. 前端读取最新 published_version 对应的 snapshot。

## 4. 数据库表建议

基础流水线表：

1. rpt.run_batch
2. rpt.metric_series_points
3. rpt.report_payload

配置与发布表：

1. rpt.report
2. rpt.report_section
3. rpt.report_chart
4. rpt.dataset_definition
5. rpt.render_snapshot
6. rpt.report_publish_log

设计原则：

1. option 和绑定配置用 jsonb
2. 指标点结构化存储便于核对
3. 快照完整存储便于发布追溯

## 5. API 设计

统一 API（展示端与管理端共用）：

1. POST /v1/reports （创建 report）
2. GET /v1/reports （查询 report 列表）
3. GET /v1/reports/{report_key} （查询 report 详情）
4. PUT /v1/reports/{report_key} （更新 report 基础信息）
5. DELETE /v1/reports/{report_key} （删除 report）
6. GET /v1/reports/{report_key}/sections/{section_key}
7. POST /v1/reports/{report_key}/sections （创建 section）
8. POST /v1/reports/{report_key}/sections/{section_key}/charts （创建 chart）
9. POST /v1/reports/{report_key}/publish

作业 API（同一命名空间）：

1. POST /v1/jobs/extract
2. POST /v1/jobs/metric
3. POST /v1/jobs/assemble
4. POST /v1/jobs/publish

当前阶段约定：

1. 展示端与管理端共用同一套 API。
2. 暂不引入鉴权与角色控制。
3. 先完成数据抽取、组装、发布闭环。

## 5.1 接口契约样例（后端开发可直接落地）

统一响应结构（成功）：

```json
{
	"code": 0,
	"message": "ok",
	"data": {}
}
```

统一响应结构（失败）：

```json
{
	"code": 1001,
	"message": "invalid request",
	"error": {
		"field": "report_key",
		"detail": "report_key already exists"
	}
}
```

创建 report：POST /v1/reports

请求体：

```json
{
	"report_key": "data-analytics",
	"name": "Data Analytics",
	"type": "analytics",
	"status": "active"
}
```

响应体：

```json
{
	"code": 0,
	"message": "ok",
	"data": {
		"id": "rpt_analytics",
		"report_key": "data-analytics",
		"published_version": 0
	}
}
```

创建 section：POST /v1/reports/{report_key}/sections

请求体：

```json
{
	"section_key": "origination_trends",
	"title": "Origination Trends",
	"subtitle": null,
	"order_no": 1,
	"layout": "grid-3"
}
```

创建 chart：POST /v1/reports/{report_key}/sections/{section_key}/charts

请求体：

```json
{
	"chart_key": "orig_1",
	"chart_type": "line",
	"title": "Total Origination Balance",
	"subtitle": null,
	"dataset_binding_json": {
		"dataset_key": "ds_orig_bal",
		"series": ["Platform", "Tapes w High Grade Mix", "Tapes w Platform Mix"]
	},
	"option_template_json": {
		"xAxis": { "type": "category" },
		"yAxis": { "type": "value", "name": "Origination Balance (k)" }
	}
}
```

查询 report 详情：GET /v1/reports/{report_key}

响应体（核心结构）：

```json
{
	"code": 0,
	"message": "ok",
	"data": {
		"id": "rpt_analytics",
		"report_key": "data-analytics",
		"name": "Data Analytics",
		"sections": [
			{
				"section_key": "origination_trends",
				"title": "Origination Trends",
				"subtitle": null,
				"content_items": {
					"charts": [
						{
							"chart_id": "orig_1",
							"chart_type": "line",
							"title": "Total Origination Balance",
							"echarts": {
								"xAxis": { "type": "category", "data": ["2016-06", "2016-12"] },
								"yAxis": { "type": "value", "name": "Origination Balance (k)", "min": 0, "max": 153786874.44 },
								"series": [
									{ "name": "Platform", "type": "line", "data": [41366576.93, 80030708.74] }
								]
							},
							"table_data": null,
							"meta": {
								"formatter": "thousands",
								"metric_name": "Orig_Bal",
								"display_precision": 3
							}
						}
					]
				}
			}
		]
	}
}
```

发布 report：POST /v1/reports/{report_key}/publish

请求体：

```json
{
	"run_id": 20260320001,
	"comment": "first publish"
}
```

响应体：

```json
{
	"code": 0,
	"message": "ok",
	"data": {
		"report_key": "data-analytics",
		"published_version": 1,
		"snapshot_id": 10001
	}
}
```

后端运行配置（开发环境）：

1. DATABASE_URL="postgresql+asyncpg://postgres:squirrel_canon_20260101@117.72.204.201:5432/canon"
2. Python 连接驱动使用 asyncpg（与 URL 协议头一致）。
3. 应用启动时优先从环境变量读取，不在代码中硬编码连接串。
4. 该连接串仅用于当前开发指导，生产环境应改为密钥管理方式。

## 6. 作业流程

1. 创建 run_batch（running）
2. 执行 extract SQL
3. 执行 metric SQL
4. 执行 assembly
5. 执行质量校验
6. 写入 render_snapshot
7. 更新 run_batch 状态（success/failed）

## 7. 质量门禁

1. 时间轴单调递增
2. xAxis 与 series 点位长度一致
3. 缺失值必须为 null
4. formatter 与指标口径一致
5. payload 可追溯到 run_id 与 SQL 版本

第一版最小校验（必须实现）：

1. section 的 order_no 在同一 report 内唯一。
2. 每个 chart 至少有一个 series。
3. 每个 series 的数据点数量与 xAxis 一致。
4. 缺失数据必须是 null，不允许用 0 补齐。

## 8. Analytics 样板映射（orig_1 ~ orig_12）

section_key: origination_trends

系列统一建议：

1. Platform
2. Tapes w High Grade Mix
3. Tapes w Platform Mix

指标映射：

1. orig_1 -> Orig_Bal -> thousands
2. orig_2 -> Avg_Orig_Bal -> thousands
3. orig_3 -> Term -> decimal
4. orig_4 -> IR -> percentage
5. orig_5 -> APR -> percentage
6. orig_6 -> FICO -> decimal
7. orig_7 -> PTI -> percentage
8. orig_8 -> DTI -> percentage
9. orig_9 -> Annual_Inc -> thousands
10. orig_10 -> Debt_Consolidation_Pct -> percentage
11. orig_11 -> Existing_Borrower_Pct -> percentage
12. orig_12 -> Grade_1_Pct -> percentage

## 9. 里程碑

M1（本周）：

1. 完成 schema 与核心表
2. 完成 analytics 指标 SQL 初版
3. 完成 report 组装脚本初版

M2（下周）：

1. 接入 platform 和 financial
2. 完成发布链路
3. 完成新旧 JSON 对账报告

## 10. 待确认清单

1. 业务库 schema 与表名
2. 每个指标的原始字段映射
3. 时间字段定义（放款日/账期日/快照日）
4. 三个 series 的分群规则
5. 作业执行频率与窗口

## 11. 现有实现关联

1. SQL 基础结构：sql/report_pipeline/001_base_schema.sql
2. 指标输出契约：sql/report_pipeline/002_metric_output_contract.sql
3. 当前前端消费结构：data/echarts/*.echarts.json
