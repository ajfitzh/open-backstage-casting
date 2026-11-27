// app/[tenant]/(main)/(staff)/reports/playbill/page.tsx
import { cookies } from 'next/headers';
import { getShowById, getActiveProduction } from '@/app/lib/baserow';
import { getPlaybillDataPg } from '@/app/lib/db/operations-repo';
import PlaybillExporterClient from '@/app/components/reports/PlaybillExporterClient';

export const dynamic = 'force-dynamic';

async function getPlaybillData(tenant: string, showId: number) {
    try {
        return (await getPlaybillDataPg(tenant, showId)) ?? [];
    } catch (error) {
        console.error("Failed to fetch playbill data:", error);
        return [];
    }
}

export default async function PlaybillPage({
    params,
}: {
    params: Promise<{ tenant: string }> | { tenant: string };
}) {
    const { tenant } = await params;

    const cookieStore = await cookies();
    const cookieId = cookieStore.get('active_production_id')?.value;
    let show = null;
    
    if (cookieId) show = await getShowById(tenant, cookieId);
    if (!show) show = await getActiveProduction(tenant);

    if (!show) {
        return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Active Show Found</div>;
    }

    const castData = await getPlaybillData(tenant, show.id);

    return (
        <div className="p-6 lg:p-8">
            <PlaybillExporterClient
                tenant={tenant}
                productionId={show.id}
                showTitle={show.title}
                castData={castData}
            />
        </div>
    );
}