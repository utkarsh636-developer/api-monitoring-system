import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white font-sans overflow-x-hidden relative">
      
      {/* Decorative background grid and gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none"></div>

      <main className="relative flex flex-col items-center gap-7 text-center px-4 max-w-2xl mx-auto z-10 select-none">
        
        {/* Animated Radar Pulse Logo */}
        <div className="relative flex h-16 w-16 mb-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-indigo-400 opacity-25"></span>
          <div className="relative h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-600/30">
            📡
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent leading-none">
            API Beat
          </h1>
          <p className="max-w-md mx-auto text-sm sm:text-base text-zinc-400 font-medium leading-relaxed">
            A premium, real-time analytics dashboard for monitoring API performance, tracking response latencies, managing key permissions, and analyzing status health.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-4 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition duration-150 text-center"
          >
            Access Dashboard
          </Link>
          <Link
            href="/onboard"
            className="w-full sm:w-auto px-7 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300 rounded-xl text-sm font-bold active:scale-[0.98] transition duration-150 text-center"
          >
            Super Admin Onboarding
          </Link>
        </div>

        {/* Status indicator */}
        <div className="pt-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-xs font-semibold text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Connection Protocol: Secure HTTPS
          </div>
        </div>

      </main>
    </div>
  );
}
