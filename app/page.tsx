import Link from "next/link";

export default function Home() {
  return (
    <main className="terminal-gridline flex min-h-screen items-center justify-center px-6">
      <div className="terminal-shell w-full max-w-xl rounded-2xl p-10">
        <p className="terminal-kicker text-xs font-semibold uppercase">Falcon Exchange</p>
        <h1 className="mt-1 text-2xl font-semibold text-cyan-100">Loan BI Dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Reports hub: browse report cards first, then open a dashboard to view chapters and charts.
        </p>
        <Link
          href="/reports"
          className="mt-8 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30"
        >
          Go to Reports Hub
        </Link>
      </div>
    </main>
  );
}
