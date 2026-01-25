import { cookies } from 'next/headers';
import { getAssignments, getAuditionSlots } from '@/app/lib/baserow';
import { BarChart3, Users, Baby, Ruler } from 'lucide-react';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // Fetch Raw Data
  const [assignments, auditions] = await Promise.all([
      getAssignments(activeId),
      getAuditionSlots(activeId)
  ]);

  // --- CALCULATE STATS ---
  const totalCast = new Set(assignments.map((a: any) => a.Person?.[0]?.id)).size;
  const totalAuditions = auditions.length;
  
  // Example: Count by Age (if you had Age field) or Gender
  const genderBreakdown = { Male: 0, Female: 0, Unknown: 0 };
  auditions.forEach((a: any) => {
      const g = a.Gender?.[0]?.value?.value || "Unknown"; // Baserow select structure is deep
      if(g === 'Male') genderBreakdown.Male++;
      else if(g === 'Female') genderBreakdown.Female++;
      else genderBreakdown.Unknown++;
  });

  return (
    <main className="h-screen bg-zinc-950 text-white p-8 overflow-y-auto custom-scrollbar">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3">
            <BarChart3 className="text-blue-500" size={32}/> Production Reports
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Cast" value={totalCast} icon={<Users size={20} className="text-emerald-500"/>} />
            <StatCard label="Auditionees" value={totalAuditions} icon={<Users size={20} className="text-blue-500"/>} />
            <StatCard label="Males" value={genderBreakdown.Male} icon={<Baby size={20} className="text-indigo-500"/>} />
            <StatCard label="Females" value={genderBreakdown.Female} icon={<Baby size={20} className="text-pink-500"/>} />
        </div>

        {/* Placeholder for future charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 h-64 flex items-center justify-center">
                <p className="text-zinc-500 font-mono text-xs">Costume Sizing Distribution Chart (Coming Soon)</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 h-64 flex items-center justify-center">
                <p className="text-zinc-500 font-mono text-xs">Ticket Sales Integration (Coming Soon)</p>
            </div>
        </div>
    </main>
  );
}

function StatCard({ label, value, icon }: any) {
    return (
        <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-black/50 rounded-lg">{icon}</div>
            <div>
                <div className="text-2xl font-black leading-none">{value}</div>
                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{label}</div>
            </div>
        </div>
    )
}