// app/[tenant]/tickets/page.tsx
import { cookies } from "next/headers";
import { isPostgresEnabled } from "@/db";
import { listPublicBoxOfficePg } from "@/app/lib/db/tickets-repo";
import PublicBoxOfficeClient from "@/app/components/tickets/PublicBoxOfficeClient";

export const dynamic = "force-dynamic";

export default async function PublicTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
  searchParams?: Promise<{ canceled?: string; show?: string }> | { canceled?: string; show?: string };
}) {
  const { tenant } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const requestedShowId = Number(
    resolvedSearch?.show || cookieStore.get("active_production_id")?.value || ""
  );
  const initialProductionId =
    Number.isFinite(requestedShowId) && requestedShowId > 0 ? requestedShowId : null;

  if (!isPostgresEnabled()) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8 text-center">
        Box office ticketing is temporarily unavailable.
      </div>
    );
  }

  const data = await listPublicBoxOfficePg(tenant);
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8 text-center">
        Organization not found.
      </div>
    );
  }

  return (
    <PublicBoxOfficeClient
      tenant={tenant}
      orgName={data.orgName}
      shows={data.shows}
      initialProductionId={initialProductionId}
      wasCanceled={resolvedSearch?.canceled === "1"}
    />
  );
}
