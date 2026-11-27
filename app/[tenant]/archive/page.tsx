import { isPostgresEnabled } from "@/db";
import { getPublicShowArchivePg } from "@/app/lib/db/archive-repo";
import PublicArchiveClient from "@/app/components/archive/PublicArchiveClient";

export const dynamic = "force-dynamic";

export default async function PublicArchivePage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  if (!isPostgresEnabled()) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8 text-center">
        Show archive is temporarily unavailable.
      </div>
    );
  }

  const data = await getPublicShowArchivePg(tenant);
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8 text-center">
        Organization not found.
      </div>
    );
  }

  return <PublicArchiveClient data={data} />;
}
