import { BaserowClient } from '@/app/lib/BaserowClient';
import { getAuditionees, fetchBaserow, getDB, getTenantTableConfig } from '@/app/lib/baserow';
import ComplianceDashboard from '@/app/components/ComplianceDashboard'; 
import { cancelAudition } from '@/app/actions/auditions';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function RosterPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id);

  if (isNaN(showId)) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
              <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid Production ID</h2>
          <p className="text-zinc-400 max-w-md">The production ID provided in the URL is invalid. Please return to the Show Hub.</p>
      </main>
    );
  }

  // 1. Fetch BOTH the cast roster AND the auditionees concurrently
  const [production, castRoster, auditioners] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId).catch(() => []),
      getAuditionees(tenant, showId).catch(() => [])
  ]);

  if (!production) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Production Not Found</h2>
          <p className="text-zinc-400 max-w-md">We couldn&apos;t find a production matching ID <strong>{showId}</strong> in the {tenant} database.</p>
      </main>
    );
  }

  // 2. Merge Auditioners into the Roster (Deduplicating if they are already cast)
  const combinedRoster = [...(castRoster || [])];
  const castNames = new Set(combinedRoster.map((s: any) => s.name));

  (auditioners || []).forEach((auditioner: any) => {
      if (!castNames.has(auditioner.name)) {
          combinedRoster.push({
              ...auditioner,
              role: auditioner.role || "Auditionee",
              isCast: false 
          });
      }
  });

  // 🟢 SERVER ACTION: Delete Audition
  async function handleDeleteAudition(auditionId: string | number) {
    "use server";
    await cancelAudition(tenant, parseInt(auditionId.toString()));
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  // 🟢 SERVER ACTION: Change Time Slot
  async function handleChangeTimeSlot(auditionId: string | number, newSlotLabel: string) {
    "use server";
    const tables = await getTenantTableConfig(tenant);
    const DB = getDB(tenant);

    const slotsParams = {
        filter_type: "AND",
        [`filter__${DB.AUDITION_SLOTS.FIELDS.TIME_LABEL}__equal`]: newSlotLabel,
        [`filter__${DB.AUDITION_SLOTS.FIELDS.PRODUCTION}__link_row_has`]: showId
    };
    const slotsRes = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/`, {}, slotsParams, tenant);
    const slotList = Array.isArray(slotsRes) ? slotsRes : (slotsRes?.results || []);

    if (slotList.length > 0) {
        const slotId = slotList[0].id;
        await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
            method: "PATCH",
            body: JSON.stringify({ [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: [slotId] })
        }, {}, tenant);
    } else {
        const existingAud = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {}, {}, tenant);
        const notes = existingAud[DB.AUDITIONS.FIELDS.ADMIN_NOTES] || "";
        await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
            method: "PATCH",
            body: JSON.stringify({
                [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `${notes}\n\n[SYSTEM]: Tried to move actor to slot '${newSlotLabel}' but no matching slot was found in the database.`
            })
        }, {}, tenant);
    }
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  // 🟢 SERVER ACTION: Batch Assign Missing Numbers
  async function handleAssignMissingNumbers() {
    "use server";
    const tables = await getTenantTableConfig(tenant);
    const DB = getDB(tenant);

    // Fetch all auditions for this show directly from Baserow
    const existingRows = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, {
        filter_type: "AND",
        [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: showId
    }, tenant);
    const rowList = Array.isArray(existingRows) ? existingRows : (existingRows?.results || []);

    let existingNumbers = new Set<number>();
    const missingRows: any[] = [];

    // Parse out who has a number and who doesn't
    rowList.forEach((row: any) => {
        const numStr = row[DB.AUDITIONS.FIELDS.AUDITION_NUMBER];
        if (numStr && numStr.trim() !== "" && numStr !== "N/A") {
            const num = parseInt(numStr);
            if (!isNaN(num)) existingNumbers.add(num);
        } else {
            missingRows.push(row);
        }
    });

    if (missingRows.length === 0) return;

    // Generate pool of available numbers (1-200)
    let availableNumbers: number[] = [];
    for (let i = 1; i <= 200; i++) {
        if (!existingNumbers.has(i)) availableNumbers.push(i);
    }

    // Shuffle the available numbers to feel random like the frontend
    availableNumbers.sort(() => Math.random() - 0.5);

    // Prepare the payload for Baserow's Batch Update endpoint
    const itemsToUpdate = missingRows.map((row, idx) => ({
        id: row.id,
        [DB.AUDITIONS.FIELDS.AUDITION_NUMBER]: availableNumbers[idx].toString()
    }));

    // Send the batch update
    await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/batch/`, {
        method: "PATCH",
        body: JSON.stringify({ items: itemsToUpdate })
    }, {}, tenant);

    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard 
        productionTitle={production.title || "Active Production"} 
        students={combinedRoster}
        onDeleteAudition={handleDeleteAudition}
        onChangeTimeSlot={handleChangeTimeSlot}
        onAssignMissingNumbers={handleAssignMissingNumbers}
      />
    </main>
  );
}