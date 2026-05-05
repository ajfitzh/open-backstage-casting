// app/[tenant]/(main)/production/[id]/check-in/page.tsx
import { cookies } from 'next/headers';
import { 
    getShowById, 
    getAssignments, 
    getProductionEvents, 
    fetchBaserow, 
    DB, 
    getTenantTableConfig 
} from '@/app/lib/baserow';
import CheckInKioskClient from '@/app/components/production/CheckInKioskClient';

export const dynamic = 'force-dynamic';

// Helper to get today's existing attendance records
async function getTodayAttendance(tenant: string, eventId: number) {
    try {
        const tables = await getTenantTableConfig(tenant);
        const F = DB.ATTENDANCE.FIELDS;
        const tableId = tables.ATTENDANCE || DB.ATTENDANCE.ID;

        const params = {
            filter_type: "AND",
            [`filter__${F.REHEARSAL_PRODUCTION_EVENTS}__link_row_has`]: eventId
        };
        
        const rows = await fetchBaserow(`/database/rows/table/${tableId}/`, {}, params);
        if (!Array.isArray(rows)) return [];

        return rows.map((r: any) => ({
            personId: r[F.PERSON]?.[0]?.id,
            checkIn: r[F.CHECK_IN_TIME] || null,
            checkOut: r[F.CHECK_OUT_TIME] || null,
            status: r[F.STATUS]?.value || "Unknown"
        }));
    } catch (error) {
        return [];
    }
}

export default async function CheckInPage({ params }: { params: { tenant: string, id: string } }) {
    const { tenant, id } = params;
    
    // 1. Fetch Show and Cast
    const show = await getShowById(tenant, Number(id));
    if (!show) {
        return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">Production not found</div>;
    }

    const assignments = await getAssignments(tenant, show.id);
    
    const castList = assignments
        .filter((a: any) => a.personId)
        .map((a: any) => ({
            personId: a.personId,
            name: a.personName,
            role: a.roleName || "Ensemble"
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

    // 2. Fetch Events and find the "Active" one (For now, we just grab the first upcoming event)
    const allEvents = await getProductionEvents(tenant, show.id);
    const todayStr = new Date().toISOString().split('T')[0];
    
    let activeEvent = allEvents.find((e: any) => e.date >= todayStr);
    
    // Fallback if no future events exist
    if (!activeEvent && allEvents.length > 0) {
        activeEvent = allEvents[allEvents.length - 1]; 
    }

    if (!activeEvent) {
        return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Rehearsal Scheduled Today</div>;
    }

    // 3. Fetch existing attendance for this specific event
    const initialAttendance = await getTodayAttendance(tenant, activeEvent.id);

    return (
        <div className="p-6 lg:p-8 min-h-screen bg-zinc-950">
            <CheckInKioskClient 
                tenant={tenant} 
                productionId={show.id} 
                event={activeEvent} 
                castList={castList} 
                initialAttendance={initialAttendance} 
            />
        </div>
    );
}