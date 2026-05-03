import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from "@/auth";
import { 
  Users, Calendar, BarChart3, Ticket, 
  ChevronRight, Sparkles, Cat, 
  Theater, Waves, GraduationCap,
  UserCog, Mic 
} from 'lucide-react';

import { 
  getActiveProduction, 
  getShowById, 
  getAssignments, 
  getCreativeTeam, 
  getClasses,
  getAuditionees,     
  getScenes,        
  getProductionEvents,
  getSeasons,
  getAllShows,
  getCommitteeData 
} from '@/app/lib/baserow';

import CreativeTeam from '@/app/components/dashboard/CreativeTeam';
import SeasonContext from '@/app/components/dashboard/SeasonContext';
import WorkflowProgress from '@/app/components/dashboard/WorkflowProgress'; 

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params; 
  
  const session = await auth();
  const userRole = (session?.user as any)?.role || "Guest";

  const cookieStore = await cookies();
  const cookieId = cookieStore.get('active_production_id')?.value;
  let show = null;
  
  if (cookieId) show = await getShowById(tenant, cookieId);
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
      return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Active Show Found</div>;
  }

  const [
    assignments, 
    creativeTeam, 
    allClasses,
    auditionees,
    scenes,
    events,
    allSeasons,
    allShows,
    committeeData 
  ] = await Promise.all([
      getAssignments(tenant, show.id),
      getCreativeTeam(tenant, show.id),
      getClasses(tenant),
      getAuditionees(tenant, show.id),
      getScenes(tenant, show.id),
      getProductionEvents(tenant, show.id),
      getSeasons(tenant),
      getAllShows(tenant),
      getCommitteeData(tenant, show.id)
  ]);
  
  // 🟢 Isolate the Upcoming show specifically for the Audition Banner
  const upcomingShow = allShows.find((s: any) => s.status === "Upcoming");

  // SMART PHASE DETECTION
  const uniqueCast = new Set(assignments.filter((a: any) => a.personId).map((a: any) => a.personId));
  const uniqueAuditionees = new Set(auditionees.filter((a: any) => a.studentId).map((a: any) => a.studentId));
  const uniqueRegistered = new Set(committeeData.filter((c: any) => c.studentName).map((c: any) => c.studentName));

  let displayCount = 0;
  let displayLabel = "Cast";

  if (uniqueCast.size > 0) {
      displayCount = uniqueCast.size;
      displayLabel = "Cast";
  } else if (uniqueAuditionees.size > 0) {
      displayCount = uniqueAuditionees.size;
      displayLabel = "Auditioning";
  } else {
      displayCount = uniqueRegistered.size;
      displayLabel = "Registered";
  }

  const rawTags = show.workflowOverrides?.map((tag: any) => tag.value) || [];
  const workflowStatus = { tags: rawTags };

  const getShowTheme = (title: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes('lion')) return { icon: <Cat size={220} />, color: 'text-orange-500', bg: 'from-orange-900/40 to-red-900/20', accent: 'text-orange-400' };
    if (t.includes('mermaid')) return { icon: <Waves size={220} />, color: 'text-cyan-500', bg: 'from-cyan-900/30 to-blue-900/20', accent: 'text-cyan-400' };
    return { icon: <Theater size={220} />, color: 'text-blue-500', bg: 'from-zinc-900 to-zinc-900', accent: 'text-blue-500' };
  };

  const theme = getShowTheme(show?.title);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-20 overflow-y-auto custom-scrollbar space-y-8">
      
      {/* 1. HERO */}
      <div className={`relative overflow-hidden bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${theme.bg}`}>
         <div className={`absolute -top-12 -right-12 p-8 opacity-10 rotate-12 transition-all duration-1000 ${theme.color}`}>
            {theme.icon}
        </div>
        <div className="relative z-10 max-w-5xl">
            <div className="flex items-center gap-3 mb-4">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-1000 ${theme.accent}`}>Active Production</span>
                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{show?.season}</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white mb-8 drop-shadow-2xl max-w-3xl leading-[0.9]">{show?.title}</h1>
            <div className="flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-8">
                
                <div className="flex gap-2 shrink-0">
                    <Link 
                        href={`/production/${show.id}/cast`}
                        className="group flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg hover:bg-black/50 hover:scale-105 transition-all cursor-pointer"
                    >
                        <Users size={18} className="text-zinc-400 group-hover:text-white transition-colors"/>
                        <span className="text-sm font-black text-white group-hover:underline decoration-white/30 underline-offset-4">
                            {displayCount} {displayLabel}
                        </span>
                    </Link>

                    <Link 
                        href={`/production/${show.id}/team`}
                        className="group flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg hover:bg-black/50 hover:scale-105 transition-all cursor-pointer"
                    >
                         <UserCog size={18} className={`${theme.accent} group-hover:text-white transition-colors`}/>
                         <span className={`text-sm font-black ${theme.accent} group-hover:text-white group-hover:underline decoration-white/30 underline-offset-4 transition-colors`}>
                            Production Team
                         </span>
                    </Link>
                </div>

                <div className="hidden xl:block w-px h-8 bg-white/10"></div>
                {creativeTeam && <CreativeTeam team={creativeTeam as any} />}
            </div>
        </div>
      </div>
      {/* 🟢 THE NEW UPCOMING AUDITIONS BANNER */}
      {upcomingShow && (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group shadow-xl animate-in slide-in-from-bottom-4">
           <div className="absolute -right-10 -top-10 opacity-10 text-blue-400 rotate-12 transition-transform group-hover:rotate-45 duration-700 pointer-events-none">
              <Mic size={180} />
           </div>
           <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0">
                 <Mic size={28} className="text-white animate-pulse" />
              </div>
              <div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span> Upcoming Auditions
                 </h3>
                 <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">{upcomingShow.title}</h2>
              </div>
           </div>
           
           <div className="relative z-10 w-full md:w-auto shrink-0 mt-2 md:mt-0">
              <Link 
                  href="/audition-form"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 bg-white text-blue-900 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-50 hover:scale-105 hover:-translate-y-1 transition-all w-full md:w-auto text-xs"
              >
                  Sign Up <ChevronRight size={16} />
              </Link>
           </div>
        </div>
      )}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
         <WorkflowProgress status={workflowStatus} productionId={show.id} />
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500" /> Daily Workspace</h3>
             <ActionCard href="/schedule" title="Rehearsal Schedule" desc="View and create calls, times, and conflicts" icon={<Calendar className="text-blue-400"/>} color="bg-blue-400"/>
             <ActionCard href="/casting" title="Casting & Auditions" desc="Manage auditions, callbacks and cast grid" icon={<Users className="text-indigo-400"/>} color="bg-indigo-400"/>
        </div>
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Logistics</h3>
            <ActionCard href="/roster" title="Master Roster" desc="Contact info, compliance and status tracker" icon={<Users className="text-emerald-400"/>} color="bg-emerald-400"/>
            <ActionCard href="/reports" title="Director Reports" desc="Revenue, Cast breakdown, show health metrics" icon={<BarChart3 className="text-amber-400"/>} color="bg-amber-400"/>
        </div>
        <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-pink-500" /> Academy & Season</h3>
             <ActionCard href="/education" title="Class Manager" desc="Weekly attendance status and enrollment" icon={<GraduationCap className="text-pink-400"/>} color="bg-pink-400"/>
             <div className="p-6 rounded-3xl border border-dashed border-zinc-800/50 flex flex-col items-center justify-center text-center group transition-all hover:bg-zinc-900/30">
                <Sparkles size={24} className="text-zinc-800 group-hover:text-purple-500/50 transition-all duration-500 mb-2"/>
                <span className="text-[10px] font-black uppercase text-zinc-700 tracking-tighter">Season Planning</span>
            </div>
        </div>
      </div>

      <SeasonContext 
          activeSeasonName={show?.season} 
          seasons={allSeasons}
          allClasses={allClasses} 
          allShows={allShows} 
          activeShowStats={{ castCount: displayCount }}
      />

      <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">Open Backstage Casting</div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] text-zinc-500 font-black uppercase tracking-widest">Build 1.5.0</div>
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] text-blue-500 font-black uppercase tracking-widest">{userRole}</div>
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
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 group-hover:scale-110 group-hover:bg-black/60 transition-all duration-500">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-base group-hover:text-white transition-colors tracking-tight">{title}</h4>
                    <p className="text-xs text-zinc-500 font-medium line-clamp-1">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-zinc-800 group-hover:text-white transition-all transform group-hover:translate-x-1" />
            </div>
        </Link>
    )
}