// app/[tenant]/(main)/production/[id]/callbacks/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import { getUserProductionRole } from '@/app/lib/baserow';
import { getAuditionDeckDataPg } from '@/app/lib/db/audition-panel-repo';
import { hasPermission } from '@/app/lib/permissions';
import CallbacksClient from '@/app/components/auditions/CallbacksClient';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CallbacksPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  const showId = Number.parseInt(id, 10);
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = session.user as { id?: string; email?: string; name?: string; role?: string };
  const globalRole = user.role || 'Guest';
  const prodRole =
    user.id && !Number.isNaN(Number(user.id))
      ? await getUserProductionRole(tenant, Number(user.id), showId)
      : null;

  if (!hasPermission(globalRole, prodRole, 'view_auditions')) {
    return (
      <div className="p-10 text-center text-zinc-400">
        <p className="text-sm font-bold text-white mb-1">Callbacks Room Access Restricted</p>
        <p className="text-xs text-zinc-500">
          You need a staff or judging role on this production to access callbacks.
        </p>
      </div>
    );
  }

  const [production, deckData] = await Promise.all([
    BaserowClient.getProduction(tenant, showId),
    getAuditionDeckDataPg(tenant, showId),
  ]);

  if (!production) {
    return <div className="p-10 text-zinc-500 text-center">Production Not Found.</div>;
  }

  return (
    <main className="h-full bg-zinc-950">
      <CallbacksClient
        tenant={tenant}
        productionId={showId}
        productionTitle={String(production.title || 'Active Production')}
        serverJudgeName={user.name || user.email || 'Judge'}
        serverJudgeEmail={user.email || ''}
        serverJudgeRole={prodRole || globalRole || 'Judge'}
        initialPerformers={deckData?.performers || []}
        blueprintRoles={deckData?.blueprintRoles || []}
      />
    </main>
  );
}
