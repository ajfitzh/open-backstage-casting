import { cookies } from 'next/headers';
import { getActiveProduction, getShowById, getAssignments, getPeople } from '@/app/lib/baserow';
import Link from 'next/link';
import { 
  Users, Calendar, GraduationCap, 
  BarChart3, ClipboardCheck, Ticket, 
  ChevronRight, Star, Sparkles
} from 'lucide-react';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // Fetch show details
  const show = activeId ? await getShowById(activeId) : await getActiveProduction();
  const assignments = await getAssignments(activeId);
  const people = await getPeople();
// --- THE FIX: UNIQUE CAST COUNT ---
  // We extract the Person ID from each assignment and put it in a Set 
  // to strip away the duplicates.
  const uniqueCastIds = new Set(
    assignments
      .filter((a: any) => a["Person"] && a["Person"].length > 0)
      .map((a: any) => a["Person"][0].id)
  );
const castCount = uniqueCastIds.size; // This should now correctly say 41
  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-20">
      {/* 1. HERO SECTION: THE SHOW */}
      <div className="relative overflow-hidden bg-zinc-900 border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <Star size={180} className="text-blue-500" />
        </div>
        
        <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2 block">
                Current Production
            </span>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-4">
                {show?.Title || "No Active Show"}
            </h1>
            
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                    <Users size={16} className="text-zinc-400"/>
                    <span className="text-xs font-bold text-zinc-200">{castCount} Cast Members</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 backdrop-blur-md">
                    <Ticket size={16} className="text-emerald-500"/>
                    <span className="text-xs font-bold text-emerald-400">Tickets On Sale</span>
                </div>
            </div>
        </div>
      </div>

      {/* 2. THE ACTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Daily Operations */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Daily Operations</h3>
            <ActionCard 
                href="/schedule"
                title="Rehearsal Schedule"
                desc="View calls and conflicts"
                icon={<Calendar className="text-blue-400"/>}
                color="bg-blue-400"
            />
            <ActionCard 
                href="/education"
                title="Class Attendance"
                desc="Take attendance for Tuesday classes"
                icon={<ClipboardCheck className="text-emerald-400"/>}
                color="bg-emerald-400"
            />
        </div>

        {/* Company Management */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">People & Teams</h3>
            <ActionCard 
                href="/committees"
                title="Volunteer Committees"
                desc="Manage parent assignments"
                icon={<Users className="text-purple-400"/>}
                color="bg-purple-400"
            />
            <ActionCard 
                href="/roster"
                title="Full Roster"
                desc="Contact info and medical forms"
                icon={<Users className="text-amber-400"/>}
                color="bg-amber-400"
            />
        </div>

        {/* Analytics */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Production Health</h3>
            <ActionCard 
                href="/reports"
                title="Show Reports"
                desc="Gender, height, and revenue"
                icon={<BarChart3 className="text-pink-400"/>}
                color="bg-pink-400"
            />
            <div className="p-6 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center group transition-all">
                <Sparkles size={24} className="text-zinc-700 group-hover:text-blue-500 transition-colors mb-2"/>
                <span className="text-[10px] font-black uppercase text-zinc-600">Digital Script</span>
                <span className="text-[8px] text-zinc-700 uppercase font-bold tracking-tighter">Coming Soon</span>
            </div>
        </div>

      </div>

      {/* VERSION FOOTER */}
      <div className="mt-20 pt-8 border-t border-white/5 flex flex-col items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700">Open Backstage</div>
          <div className="px-2 py-0.5 bg-zinc-900 border border-white/5 rounded text-[8px] text-zinc-500 font-bold uppercase">v1.1.0-Production</div>
      </div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon, color }: any) {
    return (
        <Link href={href} className="group relative block bg-zinc-900 border border-white/5 p-6 rounded-2xl hover:bg-zinc-800 hover:border-white/10 transition-all shadow-lg overflow-hidden">
            {/* Hover Glow */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity ${color}`} />
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{title}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-zinc-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
            </div>
        </Link>
    )
}