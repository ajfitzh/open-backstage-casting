import { auth } from "@/auth";
import { getActiveProduction } from "@/app/lib/baserow";
import AuditionsClient from "@/app/components/auditions/AuditionsClient";

export const dynamic = "force-dynamic";

export default async function AuditionsPage({ params }: { params: { tenant: string } }) {
  // 1. Securely fetch the logged-in user's session
  const session = await auth();
  const production = await getActiveProduction(params.tenant);

  if (!production) {
    return <div className="p-8 text-center text-zinc-500">No active production found.</div>;
  }

  return (
    <AuditionsClient
      tenant={params.tenant}
      productionId={production.id}
      productionTitle={production.title}
      // 2. Pass the DB Name and Role directly into the Client!
      serverJudgeName={session?.user?.name || "Guest Judge"}
      serverJudgeRole={(session?.user as any)?.role || "Drop-In"}
    />
  );
}