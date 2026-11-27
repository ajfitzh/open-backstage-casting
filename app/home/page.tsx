import Link from 'next/link';
import { Database, GraduationCap, ArrowRight, Server, ShieldCheck } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      {/* HERO SECTION */}
      <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-36 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold tracking-wide mb-8">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Multi-Tenant Theater &amp; Performing Arts Platform
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl leading-[1.06]">
          Your Theater.{' '}
          <span className="text-zinc-400">Your Data.</span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 font-normal max-w-2xl mb-10 leading-relaxed">
          Open Backstage unifies auditions, multi-judge scoring, casting matrices, rehearsal
          schedules, box office ticketing, and academy classes in one open-source workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/workspaces?choose=1"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 min-h-[48px] rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-950/50 group"
          >
            Find Your Workspace
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="https://github.com/ajfitzh/open-backstage-casting"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center bg-zinc-900 border border-white/15 hover:bg-zinc-800 text-zinc-100 px-7 min-h-[48px] rounded-xl font-semibold text-sm transition-colors"
          >
            View Source on GitHub
          </Link>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="w-full bg-zinc-900/40 border-y border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-950 border border-white/10 p-7 rounded-2xl hover:border-blue-500/40 transition-colors">
            <div className="w-11 h-11 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-5 border border-blue-500/20">
              <Database size={22} />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-2.5">
              Tenant-Isolated PostgreSQL
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Every theater runs on clean, exportable relational tables with zero vendor lock-in.
              Admins control rosters, staff roles, schedules, and financial CSV exports directly.
            </p>
          </div>

          <div className="bg-zinc-950 border border-white/10 p-7 rounded-2xl hover:border-emerald-500/40 transition-colors">
            <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-5 border border-emerald-500/20">
              <Server size={22} />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-2.5">
              Auditions to Opening Night
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Multi-judge scoring panels, live video recording, callback comparisons, QR check-in,
              Stripe box office ticketing, and print-ready saddle-stitch playbills.
            </p>
          </div>

          <div className="bg-zinc-950 border border-white/10 p-7 rounded-2xl hover:border-purple-500/40 transition-colors">
            <div className="w-11 h-11 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-5 border border-purple-500/20">
              <GraduationCap size={22} />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-2.5">
              Built for Youth &amp; Community Theater
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Purpose-built for youth theater organizations, community stages, and school drama
              departments managing large casts, parent committees, and academy classes.
            </p>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
        <ShieldCheck size={40} className="text-zinc-400 mx-auto mb-5" />
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          Ready to launch your theater&apos;s workspace?
        </h2>
        <p className="text-zinc-300 mb-8 max-w-xl mx-auto text-sm sm:text-base">
          Request your dedicated tenant subdomain in minutes and give your artistic team, stage
          managers, and families a single home.
        </p>
        <Link
          href="/workspaces?choose=1"
          className="inline-flex items-center justify-center bg-white text-zinc-950 hover:bg-zinc-200 px-8 min-h-[48px] rounded-xl font-bold text-sm transition-colors shadow-lg"
        >
          Request a Workspace
        </Link>
      </section>
    </div>
  );
}
