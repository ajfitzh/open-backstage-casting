// app/[tenant]/(main)/production/[id]/roster/page.tsx

import { BaserowClient } from '@/app/lib/BaserowClient';
import ComplianceDashboard from '@/app/components/ComplianceDashboard'; 

export const dynamic = 'force-dynamic';

// 🟢 Rewritten to use URL-based params.id instead of cookies
export default async function RosterPage({ 
  params 
}: { 
  params: { tenant: string; id: string } 
}) {
  const tenant = params.tenant;
  const showId = parseInt(params.id); // Extracted directly from the URL path [id]

  if (isNaN(showId)) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
              <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid Production ID</h2>
          <p className="text-zinc-400 max-w-md">The production ID provided in the URL is invalid. Please return to the Show Hub.</p>
      </main>
    );
  }

  // 1. Fetch data based on the explicit ID in the URL
  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  // 2. Handle missing production (e.g., if someone types /production/999/roster)
  if (!production) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Production Not Found</h2>
          <p className="text-zinc-400 max-w-md">We couldn&apos;t find a production matching ID <strong>{showId}</strong> in the {tenant} database.</p>
      </main>
    );
  }

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard 
        productionTitle={production.title || "Active Production"} 
        students={roster || []}
      />
    </main>
  );
}