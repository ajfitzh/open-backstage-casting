import { cookies } from 'next/headers';
import { getComplianceData, getActiveProduction, getShowById } from '@/app/lib/baserow';
import { ShieldAlert, CheckCircle2, XCircle, Mail } from 'lucide-react';

export default async function CompliancePage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // Fetch Data
  const data = await getComplianceData(activeId);
  
  // Calc Stats
  const total = data.length;
  const fullyCompliant = data.filter((p: any) => p.signedAgreement && p.paidFees && p.headshotSubmitted).length;
  const health = total > 0 ? Math.round((fullyCompliant / total) * 100) : 100;

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900 shrink-0">
        <h1 className="text-xl font-black uppercase italic tracking-wider flex items-center gap-2">
            <ShieldAlert className={health < 80 ? "text-amber-500" : "text-emerald-500"} /> Compliance Deck
        </h1>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <div className="text-2xl font-black leading-none">{health}%</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Roster Health</div>
            </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((person: any) => {
                const isSafe = person.signedAgreement && person.paidFees;
                return (
                    <div key={person.id} className={`p-4 rounded-xl border transition-all ${isSafe ? 'bg-zinc-900 border-white/5' : 'bg-red-950/10 border-red-500/30'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="font-bold">{person.performerName}</div>
                            {!isSafe && <div className="text-[9px] font-bold bg-red-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Action Needed</div>}
                        </div>
                        
                        <div className="space-y-2">
                            <ComplianceRow label="Fees Paid" active={person.paidFees} />
                            <ComplianceRow label="Waiver Signed" active={person.signedAgreement} />
                            <ComplianceRow label="Headshot" active={person.headshotSubmitted} />
                            <ComplianceRow label="Measurements" active={person.measurementsTaken} />
                        </div>

                        {!isSafe && (
                            <button className="mt-4 w-full py-2 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                                <Mail size={12}/> Send Reminder
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </main>
  );
}

function ComplianceRow({ label, active }: { label: string, active: boolean }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">{label}</span>
            {active ? (
                <CheckCircle2 size={14} className="text-emerald-500"/>
            ) : (
                <XCircle size={14} className="text-red-500 opacity-50"/>
            )}
        </div>
    )
}