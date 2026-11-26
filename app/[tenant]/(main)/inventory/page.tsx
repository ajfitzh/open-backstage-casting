// app/[tenant]/(main)/inventory/page.tsx
import {
  getEquipmentCheckoutOptions,
  getEquipmentInventoryWithQr,
} from "@/app/actions/equipment";
import EquipmentInventoryClient from "@/app/components/inventory/EquipmentInventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;
  const [res, pickerOptions] = await Promise.all([
    getEquipmentInventoryWithQr(tenant),
    getEquipmentCheckoutOptions(tenant),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8 pb-20">
      <EquipmentInventoryClient
        tenant={tenant}
        initialItems={res.items || []}
        productions={pickerOptions.productions}
        people={pickerOptions.people}
      />
    </main>
  );
}
