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
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8 pb-20 space-y-4">
      <div className="flex justify-end">
        <a
          href={`/api/inventory/labels/pdf?tenant=${encodeURIComponent(tenant)}&type=equipment`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-sm"
        >
          Print Avery QR Labels (PDF)
        </a>
      </div>
      <EquipmentInventoryClient
        tenant={tenant}
        initialItems={res.items || []}
        productions={pickerOptions.productions}
        people={pickerOptions.people}
      />
    </div>
  );
}
