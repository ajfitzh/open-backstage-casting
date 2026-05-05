// app/[tenant]/(main)/production/[id]/check-in/page.tsx
import { getShowById, getAuditionees } from "@/app/lib/baserow";
import CheckInBoard from "./CheckInBoard";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);

  // Fetch the show data and our newly super-charged auditionees payload
  const [show, cast] = await Promise.all([
    getShowById(tenant, productionId),
    getAuditionees(tenant, productionId).catch(() => [])
  ]);

  return (
    <CheckInBoard 
      tenant={tenant} 
      productionTitle={show?.title || "Production"} 
      initialCast={cast} 
    />
  );
}