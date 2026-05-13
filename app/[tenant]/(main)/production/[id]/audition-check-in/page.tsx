// app/[tenant]/(main)/production/[id]/audition-check-in/page.tsx
import { getShowById, getAuditionees } from "@/app/lib/baserow";
import CheckInBoard from "./CheckInBoard";

export const dynamic = "force-dynamic";

export default async function AuditionCheckInPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const productionId = parseInt(id);

  // Fetch data directly using the ID from the URL
  const [show, cast] = await Promise.all([
    getShowById(tenant, productionId),
    getAuditionees(tenant, productionId).catch(() => [])
  ]);

  if (!show) {
    return <div className="p-10 text-zinc-500 text-center bg-zinc-950 min-h-screen">Production context lost.</div>;
  }

  return (
    <CheckInBoard 
      tenant={tenant} 
      productionTitle={show.title || "Production"} 
      initialCast={cast} 
    />
  );
}