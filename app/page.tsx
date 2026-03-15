import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Loan BI Dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          金融贷款指标可视化系统第一阶段：数据获取、指标切换与趋势折线图展示。
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-lg bg-sky-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-800"
        >
          进入 Dashboard
        </Link>
      </div>
    </main>
  );
}
