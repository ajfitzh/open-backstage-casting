import Link from 'next/link';
import { Database, Theater, GraduationCap, ArrowRight, Server, ShieldCheck } from 'lucide-react';

export default function MarketingPage() {
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-6 py-32 md:py-48 flex flex-col items-center text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Now Available for CYT Affiliates
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter text-white mb-6 drop-shadow-2xl max-w-5xl leading-[0.85]">
          Your Theater. <br/><span className="text-zinc-500">Your Data.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl mb-12">
          Open Backstage is a next-generation production hub. Built on an open-source model, it gives you complete ownership of your data while providing the ease of a fully managed SaaS.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="#features" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 group">
                See How It Works <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
            <Link href="https://github.com/your-repo" target="_blank" className="bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all">
                View Source
            </Link>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="w-full bg-zinc-900/50 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-6">
                    <Database size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight text-white mb-3">Open Database Architecture</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    Built like Baserow, you own the underlying tables. No more vendor lock-in. Access your raw data, build custom API connections, and export everything with a single click.
                </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6">
                    <Server size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight text-white mb-3">Managed Hosting</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    You get the transparency of open source with the convenience of SaaS. We deploy, host, and maintain your dedicated database instance. Zero server configuration required.
                </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center mb-6">
                    <GraduationCap size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight text-white mb-3">Built for CYT & Schools</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    Pre-configured workflows designed specifically for Christian Youth Theater affiliates and high school drama departments. Handle massive casts, parent committees, and compliance effortlessly.
                </p>
            </div>

        </div>
      </section>

      {/* CTA SECTION */}
      <section className="w-full max-w-4xl mx-auto px-6 py-32 text-center">
        <ShieldCheck size={48} className="text-zinc-700 mx-auto mb-6" />
        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mb-6">
            Ready to upgrade your production?
        </h2>
        <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Get your dedicated tenant instance spun up in minutes. Bring your own domain, or use a custom Open Backstage subdomain.
        </p>
        <Link href="mailto:your-email@example.com" className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-xl">
            Contact for Hosting
        </Link>
      </section>

    </div>
  );
}