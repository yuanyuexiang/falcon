import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Loan BI Dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Reports hub: browse report cards first, then open a dashboard to view chapters and charts.
        </p>
        <Link
          href="/reports"
          className="mt-8 inline-flex rounded-lg bg-sky-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-800"
        >
          Go to Reports Hub
        </Link>
      </div>
    </main>
  );
}
