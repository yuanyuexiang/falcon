# Loan BI Dashboard 开发补充说明

## 环境要求

- Node.js >= 20.9.0
- Next.js 16+

## 环境变量

在项目根目录创建 `.env.local`：

```bash
ANALYST_API_BASE_URL=https://atlas.asksquirrel.ai
```

## 第一阶段范围

- 获取 metrics 接口数据
- 提供指标选择器
- 渲染按 Sheet 对比的堆叠平滑折线图（Tapes / Platform）
- 30 秒自动刷新
