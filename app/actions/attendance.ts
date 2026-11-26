// app/actions/attendance.ts
"use server";

import { fetchBaserow, getDB, getTenantTableConfig } from "@/app/lib/baserow";
import { requirePermission } from "@/app/lib/auth-guard";
import { isPostgresEnabled } from "@/db";
import { toggleAttendancePg } from "@/app/lib/db/operations-repo";

export async function toggleAttendance(
    tenant: string, 
    productionId: number, 
    personId: number, 
    eventId: number, 
    action: "IN" | "OUT" | "ABSENT"
) {
    const guard = await requirePermission(tenant, "view_checkin", productionId);
    if (!guard.ok) return { success: false, error: guard.error };

    if (isPostgresEnabled()) {
        try {
            return await toggleAttendancePg(tenant, productionId, personId, eventId, action);
        } catch (error) {
            console.error("[Postgres] toggleAttendance failed, falling back to Baserow:", error);
        }
    }

    try {
        const DB = getDB(tenant);
        const tables = await getTenantTableConfig(tenant);
        const F = DB.ATTENDANCE.FIELDS;
        const tableId = tables.ATTENDANCE || DB.ATTENDANCE.ID;

        const params = {
            filter_type: "AND",
            [`filter__${F.PERSON}__link_row_has`]: personId,
            [`filter__${F.REHEARSAL_PRODUCTION_EVENTS}__link_row_has`]: eventId
        };
        
        const existingRows = await fetchBaserow(`/database/rows/table/${tableId}/`, {}, params, tenant);
        const now = new Date().toISOString();

        let payload: any = {};
        
        if (action === "IN") {
            payload = { [F.CHECK_IN_TIME]: now, [F.STATUS]: "Present" };
        } else if (action === "OUT") {
            payload = { [F.CHECK_OUT_TIME]: now };
        } else if (action === "ABSENT") {
            payload = { [F.STATUS]: "Unexcused Absence" };
        }

        if (Array.isArray(existingRows) && existingRows.length > 0) {
            const rowId = existingRows[0].id;
            const res = await fetchBaserow(`/database/rows/table/${tableId}/${rowId}/`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            }, {}, tenant);
            return { success: !res.error, data: res };
        } else {
            payload[F.PERSON] = [personId];
            payload[F.PRODUCTION] = [productionId];
            payload[F.REHEARSAL_PRODUCTION_EVENTS] = [eventId];
            
            const res = await fetchBaserow(`/database/rows/table/${tableId}/`, {
                method: "POST",
                body: JSON.stringify(payload)
            }, {}, tenant);
            return { success: !res.error, data: res };
        }
    } catch (error) {
        console.error("Attendance Toggle Error:", error);
        return { success: false, error: "Database connection failed." };
    }
}
