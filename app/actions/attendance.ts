// app/actions/attendance.ts
"use server";

import { fetchBaserow, getDB, getTenantTableConfig } from "@/app/lib/baserow";

export async function toggleAttendance(
    tenant: string, 
    productionId: number, 
    personId: number, 
    eventId: number, 
    action: "IN" | "OUT" | "ABSENT"
) {
    try {
        const DB = getDB(tenant);
        const tables = await getTenantTableConfig(tenant);
        const F = DB.ATTENDANCE.FIELDS;
        const tableId = tables.ATTENDANCE || DB.ATTENDANCE.ID;

        // 1. Check if an attendance record already exists for this Person + Event
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
            payload = { [F.STATUS]: "Unexcused Absence" }; // Triggers the illness/absence policy warning
        }

        if (Array.isArray(existingRows) && existingRows.length > 0) {
            // Update existing row (e.g., they are now checking out)
            const rowId = existingRows[0].id;
            const res = await fetchBaserow(`/database/rows/table/${tableId}/${rowId}/`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            }, {}, tenant);
            return { success: !res.error, data: res };
        } else {
            // Create a brand new attendance record
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