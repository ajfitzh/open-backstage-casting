import { cookies } from 'next/headers';
import { getActiveProduction, getShowById, getAssignments } from '@/app/lib/baserow';
import { MOCK_CLASSES } from '../lib/educationFillerData'; // <--- Import Education Data
import Link from 'next/link';
import { 
  Users, Calendar, BarChart3, ClipboardCheck, Ticket, 
  ChevronRight, Sparkles, Cat, Music, 
  Theater, Newspaper, Waves, Gavel, Snowflake, 
  Crown, Trees, Coffee, Bell, Stars, 
  Sun, CloudRain, Building2, Anchor, 
  Dog, GraduationCap, Heart, Home,
  Briefcase, Megaphone, UserCheck
} from 'lucide-react';
import CreativeTeam from '@/app/components/dashboard/CreativeTeam';

// --- STATIC SEASON STAFF DATA ---
const SEASON_STAFF = [
  { name: "Aimee Mestler", role: "Executive Director", initials: "AM", color: "bg-indigo-600", icon: <Crown size={12}/> },
  { name: "Krista McKinley", role: "Business Manager", initials: "KM", color: "bg-emerald-600", icon: <Briefcase size={12}/> },
  { name: "Jenny Adler", role: "Production Coordinator", initials: "JA", color: "bg-pink-600", icon: <Megaphone size={12}/> },
  { name: "Elizabeth Davis", role: "Education Coordinator", initials: "ED", color: "bg-blue-600", icon: <GraduationCap size={12}/> },
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  const show = activeId ? await getShowById(activeId) : await getActiveProduction();
  const assignments = await getAssignments(activeId);
  
  // --- 1. CAST STATS ---
  const uniqueCastIds = new Set(
    assignments
      .filter((a: any) => a["Person"] && a["Person"].length > 0)
      .map((a: any) => a["Person"][0].id)
  );
  const castCount = uniqueCastIds.size;

  // --- 2. ACADEMY STATS ---
  const academyCount = MOCK_CLASSES.reduce((acc, c) => acc + c.enrolled, 0);
  
  // --- 3. MINISTRY/FAMILY STATS (Estimated) ---
  // Assuming some overlap between cast & classes, and siblings
  const totalStudents = castCount + academyCount;
  const familyCount = Math.floor(totalStudents * 0.75); // Approx 1.3 students per family

  // --- 🎨 DYNAMIC THEME ENGINE ---
  const getShowTheme = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('lion')) return { icon: <Cat size={220} />, color: 'text-orange-500', bg: 'from-orange-900/40 to-red-900/20', accent: 'text-orange-400' };
    if (t.includes('jungle') || t.includes('shrek') || t.includes('tarzan')) return { icon: <Trees size={220} />, color: 'text-emerald-600', bg: 'from-emerald-900/40 to-green-900/20', accent: 'text-emerald-400' };
    if (t.includes('mermaid') || t.includes('moana')) return { icon: <Waves size={220} />, color: 'text-cyan-500', bg: 'from-cyan-900/30 to-blue-900/20', accent: 'text-cyan-400' };
    if (t.includes('frozen') || t.includes('elf')) return { icon: <Snowflake size={220} />, color: 'text-sky-300', bg: 'from-sky-900/40 to-blue-900/30', accent: 'text-sky-200' };
    if (t.includes('beauty') || t.includes('cinderella')) return { icon: <Crown size={220} />, color: 'text-purple-400', bg: 'from-purple-900/40 to-fuchsia-900/20', accent: 'text-amber-400' };
    if (t.includes('wonka') || t.includes('matilda')) return { icon: <Sparkles size={220} />, color: 'text-pink-500', bg: 'from-pink-900/30 to-rose-900/20', accent: 'text-pink-400' };
    if (t.includes('newsies') || t.includes('annie')) return { icon: <Newspaper size={220} />, color: 'text-zinc-400', bg: 'from-zinc-800/40 to-zinc-900', accent: 'text-zinc-200' };
    return { icon: <Theater size={220} />, color: 'text-blue-500', bg: 'from-zinc-900 to-zinc-900', accent: 'text-blue-500' };
  };

  const theme = getShowTheme(show?.Title || "");

  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-20 overflow-y-auto custom-scrollbar space-y-8">
      
      {/* ========================================= */}
      {/* 1. ACTIVE PRODUCTION HERO (The "Now")     */}
      {/* ========================================= */}
      <div className={`relative overflow-hidden bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${theme.bg}`}>
        
        {/* Theme Icon */}
        <div className={`absolute -top-12 -right-12 p-8 opacity-10 rotate-12 transition-all duration-1000 ${theme.color}`}>
            {theme.icon}
        </div>
        
        <div className="relative z-10 max-w-4xl">
            {/* Context Badge */}
            <div className="flex items-center gap-3 mb-4">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-1000 ${theme.accent}`}>
                    Active Production
                </span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white mb-6 drop-shadow-2xl max-w-2xl">
                {show?.Title || "Select Production"}
            </h1>
            
            {/* Show Stats & Team */}
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
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
                <div className="hidden md:block w-px h-8 bg-white/10"></div>
                <CreativeTeam />
            </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. SEASON OVERVIEW (The "Foundation")     */}
      {/* ========================================= */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-2">
                      <Heart size={14} className="text-pink-500" /> Season 2026 Overview
                  </h2>
                  <h3 className="text-2xl font-black italic text-white tracking-tight">Ministry & Operations</h3>
              </div>
              
              {/* Core Staff Display */}
              <div className="flex -space-x-3">
                  {SEASON_STAFF.map((staff, i) => (
                      <div key={i} className="group relative">
                          <div className={`w-10 h-10 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-black text-white cursor-help shadow-lg ${staff.color}`}>
                              {staff.initials}
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <p className="text-xs font-bold text-white">{staff.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                                  {staff.icon} {staff.role}
                              </div>
                          </div>
                      </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                      +4
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Academy Card */}
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                      <GraduationCap size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-black text-white">{academyCount}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Class Students</div>
                  </div>
              </div>

              {/* Cast Card */}
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10 text-purple-400">
                      <Stars size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-black text-white">{castCount}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Active Cast</div>
                  </div>
              </div>

              {/* Families Card */}
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                      <Home size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-black text-white">{familyCount}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Family Units</div>
                  </div>
              </div>

              {/* Staff Status */}
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
                      <UserCheck size={20} />
                  </div>
                  <div>
                      <div className="text-2xl font-black text-white">4/4</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Directors Active</div>
                  </div>
              </div>
          </div>
      </div>

      {/* ========================================= */}
      {/* 3. THE ACTION GRID (Tools)                */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Daily Operations */}
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

        {/* COLUMN 2: Logistics */}
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

        {/* COLUMN 3: Academy */}
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
      <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">Open Backstage Casting</div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] text-zinc-500 font-black uppercase tracking-widest">Build 1.2.2</div>
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