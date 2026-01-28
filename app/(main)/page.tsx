import { cookies } from 'next/headers';
import Link from 'next/link';
import { getServerSession } from "next-auth"; // <--- NEW: Auth Import
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // <--- NEW: Auth Options
import { 
  Users, Calendar, BarChart3, Ticket, 
  ChevronRight, Sparkles, Cat, 
  Theater, Newspaper, Waves, Snowflake, 
  Crown, Trees, Megaphone, GraduationCap, Heart, Home,
  LayoutGrid, TrendingUp, UserPlus, AlertTriangle, Sun
} from 'lucide-react';

import { getActiveProduction, getShowById, getAssignments, getCreativeTeam, getAuditionees } from '@/app/lib/baserow';
// I'm keeping your imports. If these files don't exist yet, simple placeholders will be needed.
import { MOCK_CLASSES } from '@/app/lib/educationFillerData';
import CreativeTeam from '@/app/components/dashboard/CreativeTeam';

// Force dynamic rendering for Vercel
export const dynamic = 'force-dynamic';

const SEASON_STAFF = [
  { name: "Aimee Mestler", role: "Executive Director", initials: "AM", color: "bg-indigo-600", icon: <Crown size={12}/> },
  { name: "Krista McKinley", role: "Business Manager", initials: "KM", color: "bg-emerald-600", icon: <Users size={12}/> },
  { name: "Jenny Adler", role: "Production Coord", initials: "JA", color: "bg-pink-600", icon: <Megaphone size={12}/> },
  { name: "Elizabeth Davis", role: "Education Coord", initials: "ED", color: "bg-blue-600", icon: <GraduationCap size={12}/> },
];

export default async function DashboardPage() {
  // 1. GET SESSION (Who is logged in?)
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || "Guest";
  const firstName = session?.user?.name?.split(' ')[0] || "Cast Member";

  // 2. RESOLVE ACTIVE PRODUCTION (The 404 Fix)
  const cookieStore = await cookies();
  const cookieId = Number(cookieStore.get('active_production_id')?.value);

  let show = null;
  
  // Try cookie first
  if (cookieId) {
    show = await getShowById(cookieId);
  }
  
  // Fallback to "Is Active" checkbox if cookie fails or returns 404
  if (!show || show.detail === "Not found") { 
    show = await getActiveProduction();
  }

  // 3. SAFETY VALVE: If still no show, render Empty State
  if (!show) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-6 bg-yellow-500/10 rounded-full border border-yellow-500/20">
            <AlertTriangle size={64} className="text-yellow-500" />
        </div>
        <h1 className="text-3xl font-black uppercase italic">No Active Production</h1>
        <p className="text-zinc-400 max-w-md">
          We couldn't find a show marked as "Active" in Baserow. Please ask an administrator to check the Productions table.
        </p>
      </div>
    );
  }

  const activeProdId = show.id;

  // --- PARALLEL FETCH ---
  const [assignments, creativeTeam, auditionees] = await Promise.all([
      getAssignments(activeProdId),
      getCreativeTeam(activeProdId),
      getAuditionees(activeProdId)
  ]);
  
  // --- STATS CALCULATION ---
  const uniqueCastIds = new Set(
    assignments
      .filter((a: any) => a["Person"] && a["Person"].length > 0)
      .map((a: any) => a["Person"][0].id)
  );
  const castCount = uniqueCastIds.size;
  const academyCount = MOCK_CLASSES ? MOCK_CLASSES.reduce((acc: number, c: any) => acc + c.enrolled, 0) : 0;
  const totalStudents = castCount + academyCount;
  const familyCount = Math.floor(totalStudents * 0.75); 

  // New Student / Retention Logic
  const newStudentsCount = auditionees.filter((a: any) => {
      const status = (a["Status"]?.value || a["Tenure"]?.value || "").toLowerCase(); 
      return status.includes("new") || status.includes("first");
  }).length;

  const retentionRate = castCount > 0 
    ? Math.round(((castCount - newStudentsCount) / castCount) * 100) 
    : 100;

  // --- THEME ENGINE ---
  const getShowTheme = (title: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes('lion')) return { icon: <Cat size={220} />, color: 'text-orange-500', bg: 'from-orange-900/40 to-red-900/20', accent: 'text-orange-400' };
    if (t.includes('jungle') || t.includes('shrek') || t.includes('tarzan')) return { icon: <Trees size={220} />, color: 'text-emerald-600', bg: 'from-emerald-900/40 to-green-900/20', accent: 'text-emerald-400' };
    if (t.includes('mermaid') || t.includes('moana') || t.includes('fish')) return { icon: <Waves size={220} />, color: 'text-cyan-500', bg: 'from-cyan-900/30 to-blue-900/20', accent: 'text-cyan-400' };
    if (t.includes('frozen') || t.includes('elf')) return { icon: <Snowflake size={220} />, color: 'text-sky-300', bg: 'from-sky-900/40 to-blue-900/30', accent: 'text-sky-200' };
    if (t.includes('beauty') || t.includes('cinderella')) return { icon: <Crown size={220} />, color: 'text-purple-400', bg: 'from-purple-900/40 to-fuchsia-900/20', accent: 'text-amber-400' };
    if (t.includes('wonka')) return { icon: <Sparkles size={220} />, color: 'text-pink-500', bg: 'from-pink-900/30 to-rose-900/20', accent: 'text-pink-400' };
    if (t.includes('newsies') || t.includes('annie')) return { icon: <Newspaper size={220} />, color: 'text-zinc-400', bg: 'from-zinc-800/40 to-zinc-900', accent: 'text-zinc-200' };
    if (t.includes('oklahoma') || t.includes('music man')) return { icon: <Sun size={220} />, color: 'text-amber-600', bg: 'from-amber-900/30 to-orange-900/20', accent: 'text-amber-500' };
    return { icon: <Theater size={220} />, color: 'text-blue-500', bg: 'from-zinc-900 to-zinc-900', accent: 'text-blue-500' };
  };

  const theme = getShowTheme(show?.Title);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-20 overflow-y-auto custom-scrollbar space-y-8">
      
      {/* 1. HERO */}
      <div className={`relative overflow-hidden bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${theme.bg}`}>
        <div className={`absolute -top-12 -right-12 p-8 opacity-10 rotate-12 transition-all duration-1000 ${theme.color}`}>
            {theme.icon}
        </div>
        
        <div className="relative z-10 max-w-5xl">
            <div className="flex items-center gap-3 mb-4">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-1000 ${theme.accent}`}>
                    Active Production
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {show?.Season?.value || "General Season"}
                </span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white mb-8 drop-shadow-2xl max-w-3xl leading-[0.9]">
                {show?.Title || "Select Production"}
            </h1>
            
            <div className="flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-8">
                <div className="flex gap-2 shrink-0">
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
                        <Users size={18} className="text-zinc-400"/>
                        <span className="text-sm font-black text-white">{castCount} Cast</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
                        <Ticket size={18} className={theme.accent}/>
                        <span className={`text-sm font-black ${theme.accent}`}>Box Office</span>
                    </div>
                </div>
                <div className="hidden xl:block w-px h-8 bg-white/10"></div>
                
                {/* DYNAMIC TEAM COMPONENT - Graceful fallback if component fails or data is empty */}
                {creativeTeam && <CreativeTeam team={creativeTeam} />}
            </div>
        </div>
      </div>

      {/* 2. SEASON OVERVIEW (With Real Metrics) */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Heart size={300} className="text-pink-500 rotate-12"/>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 relative z-10">
              <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-2">
                      <LayoutGrid size={14} className="text-blue-500" /> Season Overview
                  </h2>
                  <h3 className="text-2xl font-black italic text-white tracking-tight">
                    {/* PERSONALIZED WELCOME */}
                    Welcome back, {firstName}
                  </h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                  {SEASON_STAFF.map((staff, i) => (
                      <div key={i} className="flex items-center gap-3 bg-zinc-950 border border-white/5 rounded-full p-1.5 pr-4 shadow-sm hover:border-white/10 transition-colors cursor-default">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md ${staff.color}`}>
                              {staff.initials}
                          </div>
                          <div className="flex flex-col leading-none">
                              <span className="text-[10px] font-bold text-zinc-300">{staff.name.split(' ')[0]}</span>
                              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">{staff.role.split(' ')[0]}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              
              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex flex-col justify-between h-32 hover:bg-black/60 transition-colors group">
                  <div className="p-2 w-fit rounded-lg bg-blue-500/10 text-blue-400 mb-2 group-hover:bg-blue-500/20 transition-colors"><GraduationCap size={20} /></div>
                  <div>
                      <div className="text-3xl font-black text-white">{academyCount}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Class Students</div>
                  </div>
              </div>

              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex flex-col justify-between h-32 hover:bg-black/60 transition-colors group">
                  <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-2 group-hover:bg-emerald-500/20 transition-colors"><Home size={20} /></div>
                  <div>
                      <div className="text-3xl font-black text-white">~{familyCount}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Family Units</div>
                  </div>
              </div>

              {/* NEW STUDENT METRIC */}
              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex flex-col justify-between h-32 hover:bg-black/60 transition-colors group">
                  <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-400 mb-2 group-hover:bg-amber-500/20 transition-colors"><UserPlus size={20} /></div>
                  <div>
                      <div className="text-3xl font-black text-white">{newStudentsCount}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">New Students</div>
                  </div>
              </div>

              {/* RETENTION METRIC */}
              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex flex-col justify-between h-32 hover:bg-black/60 transition-colors group">
                  <div className="p-2 w-fit rounded-lg bg-pink-500/10 text-pink-400 mb-2 group-hover:bg-pink-500/20 transition-colors"><TrendingUp size={20} /></div>
                  <div>
                      <div className="text-3xl font-black text-white">{retentionRate}%</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Retention Rate</div>
                  </div>
              </div>
          </div>
      </div>

      {/* 3. ACTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500" /> Daily Workspace
            </h3>
            <ActionCard href="/schedule" title="Rehearsal Schedule" desc="View and create calls, times, and conflicts" icon={<Calendar className="text-blue-400"/>} color="bg-blue-400"/>
             <ActionCard href="/casting" title="Casting & Auditions" desc="Manage auditions, callbacks and cast grid" icon={<Users className="text-indigo-400"/>} color="bg-indigo-400"/>
        </div>
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-500" /> Logistics
            </h3>
            <ActionCard href="/roster" title="Master Roster" desc="Contact info, compliance and status tracker" icon={<Users className="text-emerald-400"/>} color="bg-emerald-400"/>
            <ActionCard href="/reports" title="Director Reports" desc="Revenue, Cast breakdown, show health metrics" icon={<BarChart3 className="text-amber-400"/>} color="bg-amber-400"/>
        </div>
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-pink-500" /> Academy & Season
            </h3>
            <ActionCard href="/education" title="Class Manager" desc="Weekly attendance status and enrollment" icon={<GraduationCap className="text-pink-400"/>} color="bg-pink-400"/>
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
            <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] text-zinc-500 font-black uppercase tracking-widest">Build 1.5.0</div>
            {/* Show User Role in Footer */}
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] text-blue-500 font-black uppercase tracking-widest">
                {userRole}
            </div>
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