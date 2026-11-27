import { getShowById, getProductionEvents, getAssignments } from '@/app/lib/baserow';
import NightlyReportClient from '@/app/components/production/NightlyReportClient';
import SendRehearsalReportButton from '@/app/components/production/SendRehearsalReportButton';
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
    }

    // Get cast emails (to simulate sending the report)
    const assignments = await getAssignments(tenant, show.id);
    const castEmails = assignments.map((a: any) => a.email).filter(Boolean);

    const presentCount = attendance.filter((a) => a.status === "Present").length;
    const lateNames = attendance.filter((a) => a.status === "Late").map((a) => String(a.name));
    const absentNames = attendance.filter((a) => a.status === "Absent").map((a) => String(a.name));

    return (
        <div className="p-6 lg:p-8 min-h-full bg-zinc-950 space-y-6">
            <div className="flex justify-end">
              <SendRehearsalReportButton
                tenant={tenant}
                productionId={show.id}
                reportDate={activeEvent?.date || todayStr}
                presentCount={presentCount}
                lateNames={lateNames}
                absentNames={absentNames}
              />
            </div>
            <NightlyReportClient 
                todayEvent={activeEvent}
                attendance={attendance}
                scenesWorked={scenesWorked}
                castEmails={castEmails}
            />
        </div>
    );
}