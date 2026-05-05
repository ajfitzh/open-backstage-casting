import { getShowById, getAssignments, fetchBaserow, DB, getTenantTableConfig } from '@/app/lib/baserow';
import CostumePullSheet from '@/app/components/production/CostumePullSheet';

export const dynamic = 'force-dynamic';

export default async function CostumesPage({ params }: { params: { tenant: string, id: string } }) {
    const { tenant, id } = params;
    const show = await getShowById(tenant, Number(id));

    if (!show) {
        return (
            <div className="p-6 lg:p-8 min-h-screen bg-zinc-950">
                <p className="text-white">Show not found.</p>
            </div>
        );
    }

    // 1. Get the cast and their roles
    const assignments = await getAssignments(tenant, show.id);
    const castAssignments = assignments.filter((a: any) => a.personId);

    // 2. Fetch Measurements for the cast
    const tables = await getTenantTableConfig(tenant);
    const F = DB.MEASUREMENTS.FIELDS;
    const tableId = tables.MEASUREMENTS || DB.MEASUREMENTS.ID;
    
    const measurementsRes = await fetchBaserow(`/database/rows/table/${tableId}/`);
    const measurements = Array.isArray(measurementsRes) ? measurementsRes : [];

    // 3. Merge them together
    const castWithMeasurements = castAssignments.map((actor: any) => {
        // Find the measurement row that links to this person
        const measure = measurements.find((m: any) => m[F.PERSON]?.[0]?.id === actor.personId);
        
        return {
            name: actor.personName,
            role: actor.roleName || "Ensemble",
            height: measure?.[F.HEIGHT] || null,
            chest: measure?.[F.CHEST] || null,
            waist: measure?.[F.WAIST] || null,
            inseam: measure?.[F.INSEAM] || null,
            shoeSize: measure?.[F.SHOE_SIZE] || null
        };
    }).sort((a: any, b: any) => a.name.localeCompare(b.name));

    return (
        <div className="p-6 lg:p-8 min-h-screen bg-zinc-950">
            <CostumePullSheet 
                castWithMeasurements={castWithMeasurements}
                showTitle={show.title}
            />
        </div>
    );
}