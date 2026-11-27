// app/[tenant]/(main)/production/[id]/conflicts/page.tsx
import { BaserowClient } from "@/app/lib/BaserowClient";
import ConflictsClient from "@/app/components/conflicts/ConflictsClient";

export const dynamic = "force-dynamic";

export default async function ConflictMatrixPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id, 10);

  const [production, conflicts, events, roster] = await Promise.all([
    BaserowClient.getProduction(tenant, showId),
    BaserowClient.getConflictsForShow(tenant, showId),
    BaserowClient.getEventsForShow(tenant, showId),
    BaserowClient.getRosterForShow(tenant, showId).catch(() => []),
  ]);

  if (!production) return <div className="p-10 text-zinc-500">Production not found.</div>;

  const actors = (roster || []).map((r: any) => ({
    id: Number(r.performerId || r.id),
    name: r.name || "Unnamed Actor",
  }));

  return (
    <main className="h-full bg-zinc-950">
      <ConflictsClient
        tenant={tenant}
        productionId={showId}
        initialConflicts={conflicts || []}
        events={events || []}
        showTitle={String(production.title || "Production")}
        actors={actors}
      />
    </main>
  );
}
