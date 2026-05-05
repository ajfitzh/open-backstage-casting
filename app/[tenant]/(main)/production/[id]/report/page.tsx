import { getShowById, getProductionEvents, fetchBaserow, DB, getTenantTableConfig, getAssignments } from '@/app/lib/baserow';
import NightlyReportClient from '@/app/components/production/NightlyReportClient';

export const dynamic = 'force-dynamic';

export default async function NightlyReportPage({ params }: { params: { tenant: string, id: string } }) {
    const { tenant, id } = params;
    const show = await getShowById(tenant, Number(id));
    if (!show) {
        return (
            <div className="p-6 lg:p-8 min-h-screen bg-zinc-950 text-white">
                <p>Show not found.</p>
            </div>
        );
    }

    // Get today's event (simplified for MVP)
    const allEvents = await getProductionEvents(tenant, show.id);
    const todayStr = new Date().toISOString().split('T')[0];
    let activeEvent = allEvents.find((e: any) => e.date >= todayStr) || allEvents[allEvents.length - 1];

    // Fetch today's attendance to find absences
    let attendance: { name: any; status: any; }[] = [];
    if (activeEvent) {
        const tables = await getTenantTableConfig(tenant);
        const F = DB.ATTENDANCE.FIELDS;
        const tableId = tables.ATTENDANCE || DB.ATTENDANCE.ID;
        const res = await fetchBaserow(`/database/rows/table/${tableId}/`, {}, {
            filter_type: "AND",
            [`filter__${F.REHEARSAL_PRODUCTION_EVENTS}__link_row_has`]: activeEvent.id
        });
        
        if (Array.isArray(res)) {
            attendance = res.map(r => ({
                name: r[F.PERSON]?.[0]?.value || "Unknown",
                status: r[F.STATUS]?.value || "Present"
            }));
        }
    }

    // Get cast emails (to simulate sending the report)
    const assignments = await getAssignments(tenant, show.id);
    const castEmails = assignments.map((a: any) => a.email).filter(Boolean);

    return (
        <div className="p-6 lg:p-8 min-h-screen bg-zinc-950">
            <NightlyReportClient 
                todayEvent={activeEvent}
                attendance={attendance}
                scenesWorked={["Act 1, Scene 2", "Opening Number"]} // Hardcoded for MVP display
                castEmails={castEmails}
            />
        </div>
    );
}