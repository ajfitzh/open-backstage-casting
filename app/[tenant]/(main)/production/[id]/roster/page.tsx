import { BaserowClient } from "@/app/lib/BaserowClient";
import {
  getAuditionees,
  getAuditionSlots,
  getPeople,
  fetchBaserow,
  getDB,
  getTenantTableConfig,
} from "@/app/lib/baserow";
import ComplianceDashboard from "@/app/components/ComplianceDashboard";
import { cancelAudition } from "@/app/actions/auditions";
import { revalidatePath } from "next/cache";
import { isPostgresEnabled } from "@/db";
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
    if (isPostgresEnabled()) {
      await changeAuditionTimeSlotPg(tenant, showId, parseInt(auditionId.toString(), 10), newSlotLabel);
      revalidatePath(`/${tenant}/production/${showId}/roster`);
      return;
    }

    const tables = await getTenantTableConfig(tenant);
    const DB = getDB(tenant);

    const slotsParams = {
      filter_type: "AND",
      [`filter__${DB.AUDITION_SLOTS.FIELDS.TIME_LABEL}__equal`]: newSlotLabel,
      [`filter__${DB.AUDITION_SLOTS.FIELDS.PRODUCTION}__link_row_has`]: showId,
    };
    const slotsRes = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/`, {}, slotsParams, tenant);
    const slotList = Array.isArray(slotsRes) ? slotsRes : slotsRes?.results || [];

    if (slotList.length > 0) {
      const slotId = slotList[0].id;
      await fetchBaserow(
        `/database/rows/table/${tables.AUDITIONS}/${auditionId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: [slotId] }),
        },
        {},
        tenant
      );
    }
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  async function handleAssignMissingNumbers() {
    "use server";
    if (isPostgresEnabled()) {
      await assignMissingAuditionNumbersPg(tenant, showId);
      revalidatePath(`/${tenant}/production/${showId}/roster`);
      return;
    }

    const tables = await getTenantTableConfig(tenant);
    const DB = getDB(tenant);

    const existingRows = await fetchBaserow(
      `/database/rows/table/${tables.AUDITIONS}/`,
      {},
      {
        filter_type: "AND",
        [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: showId,
      },
      tenant
    );
    const rowList = Array.isArray(existingRows) ? existingRows : existingRows?.results || [];

    const existingNumbers = new Set<number>();
    const missingRows: any[] = [];

    rowList.forEach((row: any) => {
      const numStr = row[DB.AUDITIONS.FIELDS.AUDITION_NUMBER];
      if (numStr && numStr.trim() !== "" && numStr !== "N/A") {
        const num = parseInt(numStr, 10);
        if (!isNaN(num)) existingNumbers.add(num);
      } else {
        missingRows.push(row);
      }
    });

    if (missingRows.length === 0) return;

    const availableNumbers: number[] = [];
    for (let i = 1; i <= 200; i++) {
      if (!existingNumbers.has(i)) availableNumbers.push(i);
    }
    availableNumbers.sort(() => Math.random() - 0.5);

    const itemsToUpdate = missingRows.map((row, idx) => ({
      id: row.id,
      [DB.AUDITIONS.FIELDS.AUDITION_NUMBER]: availableNumbers[idx].toString(),
    }));

    await fetchBaserow(
      `/database/rows/table/${tables.AUDITIONS}/batch/`,
      {
        method: "PATCH",
        body: JSON.stringify({ items: itemsToUpdate }),
      },
      {},
      tenant
    );

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
