// app/[tenant]/(main)/production/[id]/callbacks/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import CallbacksClient from '@/app/components/auditions/CallbacksClient'; 
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Performer } from '@/app/components/auditions/AuditionsClient'; // 🟢 Import the type

export const dynamic = 'force-dynamic';

export default async function CallbacksPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id);
  const session = await auth();

  if (!session?.user) redirect('/login');

  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  if (!production) return <div className="p-10 text-zinc-500 text-center">Production Not Found.</div>;

  // 🟢 FIXED: Typed 's' as Performer to remove the 'any' error
  const callbackRoster = (roster as Performer[]).filter((s: Performer) => s.status === 'Called Back');

  return (
    <main className="h-full bg-zinc-950">
      <CallbacksClient 
        tenant={tenant}
        productionId={showId}
        productionTitle={production.title as string}
        serverJudgeName={session.user.name || "Guest Judge"}
        serverJudgeRole={(session.user as any).role || "Drop-In"}
        initialPerformers={callbackRoster}
      />
    </main>
  );
}