import React from 'react';
import { cookies } from 'next/headers';
import { 
  ClipboardList, AlertTriangle, DollarSign, 
  CheckCircle2, Calendar, Target, Users 
} from 'lucide-react';
import { 
  getActiveProduction, 
  getShowById, 
  fetchBaserow, 
  DB, 
  getTenantTableConfig 
} from '@/app/lib/baserow';

export const dynamic = 'force-dynamic';

// 1. Helper to fetch the new reports
async function getCommitteeReports(tenant: string, productionId: number) {
  try {
    const tables = await getTenantTableConfig(tenant);
    const F = DB.COMMITTEE_REPORTS.FIELDS;
    
    // Using the bypass we established earlier in case it's not in the registry yet
    const tableId = (tables as any).COMMITTEE_REPORTS || DB.COMMITTEE_REPORTS.ID; 

    const params = {
      filter_type: "AND",
      [`filter__${F.PRODUCTION}__link_row_has`]: productionId,
    };

    const rows = await fetchBaserow(`/database/rows/table/${tableId}/`, {}, params);
    if (!Array.isArray(rows)) return [];

    return rows.map((r: any) => ({
      id: r.id,
      name: r[F.NAME] || "Untitled",
      committee: r[F.COMMITTEE_NAME]?.value || "Unassigned",
      phase: r[F.PRODUCTION_PHASE]?.value || "Unknown",
      date: r[F.REPORT_DATE] || "No Date",
      progress: r[F.PROGRESS_UPDATE] || "",
      attendance: r[F.ATTENDANCE_NOTES] || "",
      blockers: r[F.BLOCKERS_AND_NEEDS] || "",
      completion: parseInt(r[F.ESTIMATED_COMPLETION]) || 0,
      moneySpent: parseFloat(r[F.MONEY_SPENT_THIS_WEEK]) || 0,
      submitter: r[F.SUBMITTER]?.[0]?.value || "Unknown Chair"
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return [];
  }
}

export default async function CommitteesDashboardPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params;
  
  // 2. Get Active Show Context
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('active_production_id')?.value;
  let show = null;
  
  if (cookieId) show = await getShowById(tenant, cookieId);
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
    return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Active Show Found</div>;
  }

  // 3. Fetch Data
  const reports = await getCommitteeReports(tenant, show.id);
  
  // 4. Calculate Metrics
  const totalSpend = reports.reduce((sum: number, report: any) => sum + report.moneySpent, 0);
  const reportsWithBlockers = reports.filter((r: any) => r.blockers.trim().length > 0);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8 space-y-8 animate-in fade-in">
      
      {/* HEADER & METRICS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Staff Dashboard</span>
               <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{show.title}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
               <ClipboardList className="text-blue-500" size={32} />
               Committee Reports
            </h1>
         </div>

         <div className="flex gap-4">
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-center min-w-[160px]">
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                 <DollarSign size={12} className="text-green-500"/> Total Spend
               </p>
               <p className="text-2xl font-black text-white">${totalSpend.toFixed(2)}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col justify-center min-w-[160px]">
               <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1 flex items-center gap-1">
                 <AlertTriangle size={12} /> Active Blockers
               </p>
               <p className="text-2xl font-black text-red-400">{reportsWithBlockers.length}</p>
            </div>
         </div>
      </div>

      {/* REPORTS GRID */}
      {reports.length === 0 ? (
         <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-16 text-center">
            <ClipboardList size={48} className="text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-black text-white tracking-tighter mb-2">No Reports Yet</h3>
            <p className="text-zinc-500 font-medium max-w-md mx-auto">Chairs have not submitted any Form L updates for this production yet. When they do, they will appear here.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {reports.map((report: any) => (
               <div key={report.id} className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl flex flex-col">
                  
                  {/* Card Header */}
                  <div className="p-6 border-b border-white/5 bg-zinc-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              {report.committee}
                           </span>
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                              <Calendar size={10} /> {report.date}
                           </span>
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tighter">{report.submitter}</h3>
                        <p className="text-xs text-zinc-400 font-medium">{report.phase}</p>
                     </div>

                     <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl border border-white/5 shrink-0">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Completion</span>
                           <span className="text-sm font-black text-emerald-400">{report.completion}%</span>
                        </div>
                        <Target size={24} className="text-emerald-500/50" />
                     </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-6 flex-1">
                     
                     {/* The Blocker Alert (Only shows if they typed something) */}
                     {report.blockers.trim() && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                           <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                           <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-red-400 mb-1">Blocker / Needs Answer</h4>
                              <p className="text-sm text-red-200 font-medium leading-relaxed">{report.blockers}</p>
                           </div>
                        </div>
                     )}

                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                           <CheckCircle2 size={12} className="text-blue-500" /> Progress Update
                        </h4>
                        <div className="bg-zinc-950 rounded-xl p-4 border border-white/5 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                           {report.progress}
                        </div>
                     </div>

                     {report.attendance.trim() && (
                        <div className="space-y-2">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                              <Users size={12} className="text-purple-500" /> Attendance & Notes
                           </h4>
                           <div className="bg-zinc-950 rounded-xl p-4 border border-white/5 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                              {report.attendance}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Card Footer (Financials) */}
                  {report.moneySpent > 0 && (
                     <div className="px-6 py-4 bg-zinc-950 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500">Reported Spend</span>
                        <span className="text-sm font-black text-white bg-green-500/20 text-green-400 px-3 py-1 rounded-lg">
                           ${report.moneySpent.toFixed(2)}
                        </span>
                     </div>
                  )}

               </div>
            ))}
         </div>
      )}
    </div>
  );
}