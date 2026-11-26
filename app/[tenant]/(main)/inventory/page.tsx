// app/[tenant]/(main)/inventory/page.tsx
import { getEquipmentInventoryWithQr } from "@/app/actions/equipment";
import EquipmentInventoryClient from "@/app/components/inventory/EquipmentInventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;
  const res = await getEquipmentInventoryWithQr(tenant);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 lg:p-8 pb-20">
      <EquipmentInventoryClient tenant={tenant} initialItems={res.items || []} />
    </main>
  );
}
