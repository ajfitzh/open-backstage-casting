import { BaserowClient } from "@/app/lib/BaserowClient";
import {
  getAuditionees,
  getAuditionSlots,
  getPeople,
} from "@/app/lib/baserow";
import ComplianceDashboard from "@/app/components/ComplianceDashboard";
import { cancelAudition } from "@/app/actions/auditions";
import { revalidatePath } from "next/cache";
import {
  assignMissingAuditionNumbersPg,
  changeAuditionTimeSlotPg,
} from "@/app/lib/db/operations-repo";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id, 10);

  if (isNaN(showId)) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Invalid Production ID</h2>
        <p className="text-zinc-400 max-w-md">
          The production ID provided in the URL is invalid. Please return to the Show Hub.
        </p>
      </main>
    );
  }

  const [production, castRoster, auditioners, auditionSlots, directoryPeople] = await Promise.all([
    BaserowClient.getProduction(tenant, showId),
    BaserowClient.getRosterForShow(tenant, showId).catch(() => []),
    getAuditionees(tenant, showId).catch(() => []),
    getAuditionSlots(tenant, showId).catch(() => []),
    getPeople(tenant).catch(() => []),
  ]);

  if (!production) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Production Not Found</h2>
        <p className="text-zinc-400 max-w-md">
          We couldn&apos;t find a production matching ID <strong>{showId}</strong> in the {tenant} database.
        </p>
      </main>
    );
  }

  const combinedRoster = [...(castRoster || [])];
  const castNames = new Set(combinedRoster.map((s: any) => s.name));

  (auditioners || []).forEach((auditioner: any) => {
    if (!castNames.has(auditioner.name)) {
      combinedRoster.push({
        ...auditioner,
        role: auditioner.role || "Auditionee",
        isCast: false,
      });
    }
  });

  async function handleDeleteAudition(auditionId: string | number) {
    "use server";
    await cancelAudition(tenant, parseInt(auditionId.toString(), 10));
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  async function handleChangeTimeSlot(auditionId: string | number, newSlotLabel: string) {
    "use server";
    await changeAuditionTimeSlotPg(tenant, showId, parseInt(auditionId.toString(), 10), newSlotLabel);
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  async function handleAssignMissingNumbers() {
    "use server";
    await assignMissingAuditionNumbersPg(tenant, showId);
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard
        tenant={tenant}
        productionId={showId}
        productionTitle={String(production.title || "Active Production")}
        students={combinedRoster}
        auditionSlots={(auditionSlots || []).map((s: any) => ({
          id: Number(s.id),
          label: s.label || `${s.day || ""} ${s.time || ""}`.trim() || "Slot",
        }))}
        directoryPeople={(directoryPeople || []).map((p: any) => ({
          id: Number(p.id),
          name: p.name || "Unnamed",
          email: p.email || "",
        }))}
        onDeleteAudition={handleDeleteAudition}
        onChangeTimeSlot={handleChangeTimeSlot}
        onAssignMissingNumbers={handleAssignMissingNumbers}
      />
    </main>
  );
}
