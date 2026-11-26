import { getShowById, getProductionEvents, fetchBaserow, getDB, getTenantTableConfig, getAssignments } from '@/app/lib/baserow';
import NightlyReportClient from '@/app/components/production/NightlyReportClient';
import { isPostgresEnabled } from '@/db';
import {
  getAttendanceForEventPg,
  getScheduledSceneNamesForEventPg,
} from '@/app/lib/db/operations-repo';

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

    // Fetch today's attendance and scheduled scenes in parallel
    let attendance: { name: any; status: any; }[] = [];
    let scenesWorked: string[] = [];
    if (activeEvent) {
        if (isPostgresEnabled()) {
            const [pgAttendance, pgScenes] = await Promise.all([
                getAttendanceForEventPg(tenant, activeEvent.id).catch(() => null),
                getScheduledSceneNamesForEventPg(tenant, activeEvent.id).catch(() => null),
            ]);
            if (pgAttendance !== null) {
                attendance = pgAttendance.map((r) => ({ name: r.name, status: r.status }));
            }
            if (pgScenes !== null) {
                scenesWorked = pgScenes;
            }
        } else {
            const DB = getDB(tenant);
            const tables = await getTenantTableConfig(tenant);
            const F = DB.ATTENDANCE.FIELDS;
            const tableId = tables.ATTENDANCE || DB.ATTENDANCE.ID;
            const slotsTableId = tables.SCHEDULE_SLOTS || DB.SCHEDULE_SLOTS.ID;
            const SLF = DB.SCHEDULE_SLOTS.FIELDS;

            const [attendanceRes, slotsRes] = await Promise.all([
                fetchBaserow(`/database/rows/table/${tableId}/`, {}, {
                    filter_type: "AND",
                    [`filter__${F.REHEARSAL_PRODUCTION_EVENTS}__link_row_has`]: activeEvent.id
                }, tenant),
                fetchBaserow(`/database/rows/table/${slotsTableId}/`, {}, {
                    filter_type: "AND",
                    [`filter__${SLF.EVENT_LINK}__link_row_has`]: activeEvent.id
                }, tenant),
            ]);
            
            if (Array.isArray(attendanceRes)) {
                attendance = attendanceRes.map(r => ({
                    name: r[F.PERSON]?.[0]?.value || "Unknown",
                    status: r[F.STATUS]?.value || "Present"
                }));
            }

            if (Array.isArray(slotsRes)) {
                const seen = new Set<string>();
                for (const slot of slotsRes) {
                    const sceneVal = slot[SLF.SCENE]?.[0]?.value;
                    const sceneName = typeof sceneVal === "string" ? sceneVal : sceneVal?.value;
                    if (sceneName && !seen.has(sceneName)) {
                        seen.add(sceneName);
                        scenesWorked.push(sceneName);
                    }
                }
            }
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
                scenesWorked={scenesWorked}
                castEmails={castEmails}
            />
        </div>
    );
}