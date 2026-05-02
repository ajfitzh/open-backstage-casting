import { BaserowClient } from "@/app/lib/BaserowClient";
// 🟢 THE FIX: Correctly import the new client component we just made!
import ProposalsClient from "@/app/components/education/ProposalsClient";

export const dynamic = "force-dynamic";

// 🟢 1. Add params to the page signature
export default async function ProposalsPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;

  // 🟢 3. Pass the tenant string to the fetcher
  // Use the clean, type-safe client!
  const proposals = await BaserowClient.getProposals(tenant);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      <div className="p-8 border-b border-white/5 bg-zinc-900/30 shrink-0">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Proposals & Bounties</h1>
        <p className="text-zinc-400">Review class ideas or claim open teaching slots.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         {/* Render our new component! */}
         <ProposalsClient proposals={proposals} />
      </div>
    </div>
  );
}