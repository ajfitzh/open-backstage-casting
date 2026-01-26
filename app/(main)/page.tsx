import { cookies } from 'next/headers';
import { getActiveProduction, getShowById, getAssignments } from '@/app/lib/baserow';
import Link from 'next/link';
import { 
  Users, Calendar, BarChart3, ClipboardCheck, Ticket, 
  ChevronRight, Sparkles, Fish, Cat, Dog, Music, 
  Theater, Book, Newspaper, Waves, Gavel, Snowflake, 
  Crown, Trees, Coffee, Bell, Stars, Paintbrush, Timer,
  Sun, CloudRain, Building2, Anchor, Heart,
  Baby, Bird, ScrollText, GraduationCap
} from 'lucide-react';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  const show = activeId ? await getShowById(activeId) : await getActiveProduction();
  const assignments = await getAssignments(activeId);
  
  // Unique Cast Count (Heads, not Roles)
  const uniqueCastIds = new Set(
    assignments
      .filter((a: any) => a["Person"] && a["Person"].length > 0)
      .map((a: any) => a["Person"][0].id)
  );
  const castCount = uniqueCastIds.size;

  // --- MOCK CREATIVE TEAM (Replace with DB fetch later) ---
  // Ideally, you'd fetch from Table 619 (Volunteers) filtering by this Production ID
  const creativeTeam = [
    { name: "Austin Fitzhugh", role: "Director", initials: "AF", color: "bg-blue-600" },
    { name: "Elizabeth ", role: "Artistic Dir.", initials: "EM", color: "bg-purple-600" },
    { name: "Sarah M.", role: "Choreographer", initials: "SM", color: "bg-emerald-600" },
  ];

  // --- 🎨 DYNAMIC THEME ENGINE ---
  const getShowTheme = (title: string) => {
    const t = title.toLowerCase();
    
    // ... (Keep your existing Theme Engine logic here, referencing snippet for brevity) ... 
    // 1. THE SAVANNAH (Lion King)
    if (t.includes('lion')) 
        return { icon: <Cat size={220} />, color: 'text-orange-500', bg: 'from-orange-900/40 to-red-900/20', accent: 'text-orange-400' };
    
    // Fallback: Generic Theater
    return { icon: <Theater size={220} />, color: 'text-blue-500', bg: 'from-zinc-900 to-zinc-900', accent: 'text-blue-500' };
  };

  const theme = getShowTheme(show?.Title || "");

  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-20 overflow-y-auto custom-scrollbar">
      
      {/* 1. DYNAMIC HERO SECTION */}
      <div className={`relative overflow-hidden bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-8 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${theme.bg}`}>
        
        {/* LARGE THEME ICON */}
        <div className={`absolute -top-12 -right-12 p-8 opacity-10 rotate-12 transition-all duration-1000 ${theme.color}`}>
            {theme.icon}
        </div>
        
        <div className="relative z-10 max-w-3xl">
            {/* SEASON CONTEXT BADGE */}
            <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 backdrop-blur-md">
                    {show?.Season?.value || "2026 Season"}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-1000 ${theme.accent}`}>
                    Active Production
                </span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white mb-6 drop-shadow-2xl">
                {show?.Title || "Select Production"}
            </h1>
            
            {/* STATS & TEAM ROW */}
            <div className="flex flex-wrap items-center gap-6">
                
                {/* Stats */}
                <div className="flex gap-2">
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
                        <Users size={18} className="text-zinc-400"/>
                        <span className="text-sm font-black text-white">{castCount} Cast</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
                        <Ticket size={18} className={theme.accent}/>
                        <span className={`text-sm font-black ${theme.accent}`}>Box Office</span>
                    </div>
                </div>

                <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                {/* Creative Team Avatars */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase mr-2 hidden md:block">Creative<br/>Team</span>
                    <div className="flex -space-x-2">
                        {creativeTeam.map((member, i) => (
                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-[9px] font-bold text-white ${member.color}`} title={`${member.name} - ${member.role}`}>
                                {member.initials}
                            </div>
                        ))}
                        <button className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                            <Users size={12} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
      </div>

      {/* 2. THE ACTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Daily Operations (Show Focused) */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500" /> Daily Workspace
            </h3>
            <ActionCard 
                href="/schedule"
                title="Rehearsal Schedule"
                desc="View and create calls, times, and conflicts"
                icon={<Calendar className="text-blue-400"/>}
                color="bg-blue-400"
            />
             <ActionCard 
                href="/casting"
                title="Casting & Auditions"
                desc="Manage auditions, callbacks and cast grid"
                icon={<Users className="text-indigo-400"/>}
                color="bg-indigo-400"
            />
        </div>

        {/* COLUMN 2: Logistics (Admin Focused) */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-500" /> Logistics
            </h3>
            <ActionCard 
                href="/roster"
                title="Master Roster"
                desc="Contact info, compliance and status tracker"
                icon={<Users className="text-emerald-400"/>}
                color="bg-emerald-400"
            />
            <ActionCard 
                href="/reports"
                title="Director Reports"
                desc="Revenue, Cast breakdown, show health metrics"
                icon={<BarChart3 className="text-amber-400"/>}
                color="bg-amber-400"
            />
        </div>

        {/* COLUMN 3: Academy (Season Focused) */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-pink-500" /> Academy & Season
            </h3>
            
            <ActionCard 
                href="/education"
                title="Class Manager"
                desc="Weekly attendance status and enrollment"
                icon={<GraduationCap className="text-pink-400"/>}
                color="bg-pink-400"
            />
            
            <div className="p-6 rounded-3xl border border-dashed border-zinc-800/50 flex flex-col items-center justify-center text-center group transition-all hover:bg-zinc-900/30">
                <Sparkles size={24} className="text-zinc-800 group-hover:text-purple-500/50 transition-all duration-500 mb-2"/>
                <span className="text-[10px] font-black uppercase text-zinc-700 tracking-tighter">Season Planning</span>
                <span className="text-[8px] text-zinc-800 uppercase font-black tracking-widest mt-1">Coming Soon</span>
            </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-24 pt-10 border-t border-white/5 flex flex-col items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">Open Backstage Casting</div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] text-zinc-500 font-black uppercase tracking-widest">Build 1.2.0</div>
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] text-blue-500 font-black uppercase tracking-widest">Active Server</div>
          </div>
      </div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon, color }: any) {
    return (
        <Link href={href} className="group relative block bg-zinc-900/50 border border-white/5 p-6 rounded-3xl hover:bg-zinc-900 hover:border-white/10 transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-sm">
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500 ${color}`} />
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 group-hover:scale-110 group-hover:bg-black/60 transition-all duration-500">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-base group-hover:text-white transition-colors tracking-tight">{title}</h4>
                    <p className="text-xs text-zinc-500 font-medium line-clamp-1">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-zinc-800 group-hover:text-white transition-all transform group-hover:translate-x-1" />
            </div>
        </Link>
    )
}