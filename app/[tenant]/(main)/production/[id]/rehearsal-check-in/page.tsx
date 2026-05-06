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
import { CalendarX } from 'lucide-react'; // 🟢 Added for empty state

export const dynamic = 'force-dynamic';

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
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-zinc-950">
                <h2 className="text-xl font-bold text-white mb-2">Production Not Found</h2>
            </div>
        );
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

    // 2. Fetch Events and find the "Active" one
    const allEvents = await getProductionEvents(tenant, show.id);
    const todayStr = new Date().toISOString().split('T')[0];
    
    let activeEvent = allEvents.find((e: any) => e.date >= todayStr);
    
    // Fallback if no future events exist
    if (!activeEvent && allEvents.length > 0) {
        activeEvent = allEvents[allEvents.length - 1]; 
    }

    // 🛑 EMPTY STATE: No Rehearsal Today
    if (!activeEvent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 bg-zinc-950 animate-in fade-in">
                <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                    <CalendarX size={40} />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">No Rehearsal Scheduled</h2>
                <p className="text-zinc-400 max-w-md text-lg">There are no upcoming events scheduled for <strong>{show.title}</strong> today. Enjoy your day off!</p>
            </div>
        );
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