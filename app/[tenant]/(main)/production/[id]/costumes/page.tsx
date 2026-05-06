import { getShowById, getAssignments, fetchBaserow, DB, getTenantTableConfig } from '@/app/lib/baserow';
import CostumePullSheet from '@/app/components/production/CostumePullSheet';
import { Shirt } from 'lucide-react'; // 🟢 Added for the empty state icon

export const dynamic = 'force-dynamic';

export default async function CostumesPage({ params }: { params: { tenant: string, id: string } }) {
    const { tenant, id } = params;
    const show = await getShowById(tenant, Number(id));

    // 🛑 1. EMPTY STATE: Show Not Found
    if (!show) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-zinc-950">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">🎭</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Show Not Found</h2>
                <p className="text-zinc-500 max-w-md">We couldn&apos;t locate this production. Please return to the dashboard and try again.</p>
            </div>
        );
    }

    // 1. Get the cast and their roles
    const assignments = await getAssignments(tenant, show.id);
    const castAssignments = assignments.filter((a: any) => a.personId);

    // 🛑 2. EMPTY STATE: No Cast Assigned Yet
    if (castAssignments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-zinc-950">
                <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
                    <Shirt size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Costume Rack Empty</h2>
                <p className="text-zinc-500 max-w-md">No cast members have been assigned to <strong>{show.title}</strong> yet. Once the show is cast, the measurement pull sheet will automatically generate here.</p>
            </div>
        );
    }

    // 2. Fetch Measurements for the cast
    const tables = await getTenantTableConfig(tenant);
    const F = DB.MEASUREMENTS.FIELDS;
    const tableId = tables.MEASUREMENTS || DB.MEASUREMENTS.ID;
    
    const measurementsRes = await fetchBaserow(`/database/rows/table/${tableId}/`);
    const measurements = Array.isArray(measurementsRes) ? measurementsRes : [];

    // 3. Merge them together
    const castWithMeasurements = castAssignments.map((actor: any) => {
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