import { BaserowClient } from '@/app/lib/BaserowClient';
import { getAuditionees, fetchBaserow, getDB } from '@/app/lib/baserow';
import { getTenantTableConfig } from '@/app/lib/tenant-config';
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
      // If they haven't been promoted to the official cast yet, add them as an Auditionee
      if (!castNames.has(auditioner.name)) {
          combinedRoster.push({
              ...auditioner,
              role: auditioner.role || "Auditionee",
              // Ensure we don't accidentally overwrite roster-specific flags
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

    // 1. Try to find a matching slot by the label the user typed
    const slotsParams = {
        filter_type: "AND",
        [`filter__${DB.AUDITION_SLOTS.FIELDS.TIME_LABEL}__equal`]: newSlotLabel,
        [`filter__${DB.AUDITION_SLOTS.FIELDS.PRODUCTION}__link_row_has`]: showId
    };
    const slotsRes = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/`, {}, slotsParams, tenant);
    const slotList = Array.isArray(slotsRes) ? slotsRes : (slotsRes?.results || []);

    if (slotList.length > 0) {
        // Found the slot, link it to the audition record!
        const slotId = slotList[0].id;
        await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
            method: "PATCH",
            body: JSON.stringify({
                [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: [slotId]
            })
        }, {}, tenant);
    } else {
        // Fallback: If they typed a custom string that doesn't match a real slot, append a warning to admin notes
        const existingAud = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {}, {}, tenant);
        const notes = existingAud[DB.AUDITIONS.FIELDS.ADMIN_NOTES] || "";
        await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
            method: "PATCH",
            body: JSON.stringify({
                [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `${notes}\n\n[SYSTEM]: Tried to move actor to slot '${newSlotLabel}' but no matching slot was found in the database.`
            })
        }, {}, tenant);
    }
    
    // Refresh the page data
    revalidatePath(`/${tenant}/production/${showId}/roster`);
  }

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard 
        productionTitle={production.title || "Active Production"} 
        students={combinedRoster}
        onDeleteAudition={handleDeleteAudition}
        onChangeTimeSlot={handleChangeTimeSlot}
      />
    </main>
  );
}