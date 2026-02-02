import { getOpenBounties } from "@/app/lib/baserow";
import { Clock, PlusCircle, User2 } from "lucide-react";

export default async function ProposalsPage() {
  // Fetch data on the server
  const bounties = await getOpenBounties();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Proposals & Bounties</h1>
          <p className="text-slate-500">Manage new class ideas and open teaching positions.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
          <PlusCircle size={16} />
          New Proposal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Render Bounties */}
        {bounties.length === 0 ? (
           <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
             No open bounties found.
           </div>
        ) : (
          bounties.map((bounty: any) => (
            // REPLACED <Card> with a styled <div>
            <div key={bounty.id} className="bg-white p-4 space-y-3 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800">{bounty.name}</h3>
                {/* This <span> acts as your Badge */}
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                  Bounty
                </span>
              </div>
              
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock size={12} /> {bounty.session}
                </div>
                <div className="flex items-center gap-2">
                  <User2 size={12} /> Age: {bounty.ageRange}
                </div>
              </div>

              <div className="pt-2">
                <button className="w-full py-2 text-xs font-bold bg-slate-100 text-slate-600 hover:bg-amber-500 hover:text-white rounded transition-colors">
                  Claim This Class
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}