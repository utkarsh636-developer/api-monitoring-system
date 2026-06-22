export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white font-sans">
      <main className="flex flex-col items-center gap-6 text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-bold shadow-lg shadow-indigo-500/20">
          U
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          API Monitoring System
        </h1>
        <p className="max-w-md text-base sm:text-lg text-zinc-400">
          A premium dashboard for tracking your APIs, monitoring latency, managing rate limits, and viewing key analytics.
        </p>
        <div className="mt-4 flex gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Frontend Ready
          </div>
        </div>
      </main>
    </div>
  );
}
