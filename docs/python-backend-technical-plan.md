# BI Report Manager Python 后端技术方案

## 1. 目标与范围

1. 将 `data` 目录中的报表 JSON 数据写入数据库。
2. 提供独立 Python 后端 API，供前端 BI Report Manager 调用。
3. 先完成可上线的 MVP，再逐步演进。
4. 方案面向单人开发，优先低复杂度和高可维护性。

## 2. 技术选型

1. Web 框架: FastAPI
2. ORM: SQLAlchemy 2.x (async)
3. 迁移工具: Alembic
4. 数据校验: Pydantic v2
5. 数据库: PostgreSQL (推荐 Supabase 或 Neon)
6. 运行方式: Uvicorn
7. 文档: FastAPI 自动生成 OpenAPI (Swagger)
8. 日志: 标准 logging 或 loguru

选型理由:

1. FastAPI 开发 JSON API 效率高。
2. Pydantic 便于严格定义输入输出模型。
3. SQLAlchemy + Alembic 适合后续持续演进。
4. 维护成本低，社区成熟。

## 3. 总体架构

1. 前端继续使用现有 Next.js 项目。
2. Python 后端作为独立服务部署。
3. 前后端通过 REST API 交互。
4. 报表数据存储在 PostgreSQL。

推荐分层:

1. API 层: 路由和请求响应模型。
2. Service 层: 业务逻辑。
3. Repository 层: 数据访问。
4. Model 层: SQLAlchemy 实体。
5. Schema 层: Pydantic DTO。

## 4. 数据库设计 (MVP)

MVP 先采用单表 + JSONB，避免过度建模。

表名: `reports`

字段:

1. `id` (PK, string), 例如 `rpt_platform`
2. `name` (string)
3. `type` (string)
4. `status` (string)
5. `project_id` (string)
6. `payload_json` (jsonb), 存储完整报表 JSON
7. `version` (int, default 1)
8. `created_at` (timestamp)
9. `updated_at` (timestamp)

索引建议:

1. 主键索引: `id`
2. 组合索引: `type`, `status`
3. 可选 GIN 索引: `payload_json` (后续按 JSON 查询时再加)

## 5. API 设计 (MVP)

API 前缀: `/v1`

1. `GET /v1/reports`
   说明: 获取报表列表，支撑前端主菜单。

2. `GET /v1/reports/{report_id}`
   说明: 获取完整报表内容。

3. `GET /v1/reports/{report_id}/sections/{section_key}`
   说明: 获取单个 section，减少一次性 payload。

可选内部接口:

1. `POST /v1/admin/reports/import`
   说明: 批量导入 JSON 文件，仅内部使用。

统一响应格式建议:

1. `code`
2. `message`
3. `data`
4. `trace_id`

## 6. 数据导入方案

导入源:

1. `rpt_platform.json`
2. `rpt_analytics.json`
3. `rpt_financial.json`

导入策略:

1. 编写 `import_reports.py` 脚本。
2. 遍历 JSON 文件并进行字段校验。
3. 以 `id` 为键执行 upsert。
4. 已存在记录时更新 `payload_json` 和 `updated_at`。
5. 可选将 `version` 自增。

校验重点:

1. 必须包含 `id`, `name`, `type`, `sections`。
2. `sections` 必须是数组。
3. 导入错误需记录文件名与错误位置。

## 7. 前后端联调方案

前端新增环境变量:

1. `NEXT_PUBLIC_REPORT_API_BASE_URL`

联调流程:

1. 前端请求由 mock 路由切换到 Python 后端。
2. 保留 fallback 开关，便于故障回退。
3. 后端开启 CORS 白名单，仅允许前端域名。

## 8. 安全与稳定性 (MVP 必做)

1. DTO 参数校验 (Pydantic)
2. CORS 白名单
3. 全局异常处理
4. 基础限流
5. 健康检查: `GET /healthz`
6. 结构化日志 (包含 trace_id)

## 9. 部署方案

推荐部署:

1. Railway 或 Render 部署 FastAPI 服务。
2. Postgres 使用托管数据库 (Supabase/Neon)。
3. 使用 Dockerfile 统一运行环境。

环境变量示例:

1. `DATABASE_URL`
2. `APP_ENV`
3. `LOG_LEVEL`
4. `CORS_ALLOW_ORIGINS`

## 10. 开发里程碑

Day 1:

1. 初始化 FastAPI + SQLAlchemy + Alembic。
2. 打通 PostgreSQL 连接。
3. 创建 `reports` 表并迁移成功。

Day 2:

1. 完成导入脚本。
2. 三份 JSON 入库成功。
3. 完成 3 个 GET API。

Day 3:

1. 前端切换到独立后端。
2. 修正联调问题。
3. 完成 Swagger 文档和 CORS 收敛。

Day 4:

1. 增加监控日志与限流。
2. 增加导入接口或后台任务。
3. 补充测试和部署文档。

## 11. 验收标准

1. 前端主菜单与子菜单都由独立后端提供数据。
2. 报表详情和 section 详情接口稳定可用。
3. 导入脚本可重复执行且幂等。
4. API 文档完整可访问。
5. 本地与测试环境可稳定部署运行。

## 12. 后续演进

1. 将 `sections` 拆表，提高查询效率。
2. 将 `charts` 拆表，支持图表级权限与缓存。
3. 引入 Redis 缓存热点报表。
4. 增加鉴权 (JWT/API Key) 与审计日志。
5. 增加 CI/CD 与自动回归测试。
