// app/[tenant]/(main)/production/[id]/auditions/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import AuditionsClient from '@/app/components/auditions/AuditionsClient';
import { auth } from '@/auth'; // Adjust path to your auth config
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AuditionsPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id);
  const session = await auth();

  // 1. Check Auth - If no judge is logged in, they can't be here
  if (!session?.user) {
    redirect('/login');
  }

  // 2. Fetch everything in parallel for speed
  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  if (!production) {
    return <div className="p-10 text-zinc-500">Production #{showId} not found.</div>;
  }

  return (
    <main className="h-full bg-zinc-950">
      <AuditionsClient 
        tenant={tenant}
        productionId={showId}
        productionTitle={String(production.title || "Active Production")}
        serverJudgeName={session.user.name || "Unknown Judge"}
        serverJudgeRole={(session.user as any).role || "Drop-In"}
        initialPerformers={roster || []} // 🟢 Now matches the updated interface!
      />
    </main>
  );
}