// app/[tenant]/tickets/page.tsx
import { isPostgresEnabled } from "@/db";
import { listPublicBoxOfficePg } from "@/app/lib/db/tickets-repo";
import PublicBoxOfficeClient from "@/app/components/tickets/PublicBoxOfficeClient";

export const dynamic = "force-dynamic";

export default async function PublicTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
  searchParams?: Promise<{ canceled?: string }> | { canceled?: string };
}) {
  const { tenant } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

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
      wasCanceled={resolvedSearch?.canceled === "1"}
    />
  );
}
