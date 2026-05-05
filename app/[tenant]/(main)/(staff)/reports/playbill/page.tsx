// app/[tenant]/(main)/(staff)/reports/playbill/page.tsx
import { cookies } from 'next/headers';
import { fetchBaserow, DB, getTenantTableConfig, getShowById, getActiveProduction } from '@/app/lib/baserow';
import PlaybillExporterClient from '@/app/components/reports/PlaybillExporterClient';

export const dynamic = 'force-dynamic';

async function getPlaybillData(tenant: string, showId: number) {
    try {
        const tables = await getTenantTableConfig(tenant);
        const F = DB.AUDITIONS.FIELDS;
        
        // Only pull people who are officially "Cast"
        const params = {
            filter_type: "AND",
            [`filter__${F.PRODUCTION}__link_row_has`]: showId,
            [`filter__${F.STATUS}__equal`]: "Cast"
        };

        const rows = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, params);
        if (!Array.isArray(rows)) return [];

        return rows.map((r: any) => ({
            id: r.id,
            name: r[F.PERFORMER]?.[0]?.value || "Unknown Actor",
            role: r[F.CAST_ROLE]?.[0]?.value || "Ensemble",
            bio: r[F.PROGRAM_BIO] || "",
            ad: r[F.CONGRATS_AD_TEXT] || ""
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error("Failed to fetch playbill data:", error);
        return [];
    }
}

export default async function PlaybillPage({ params }: { params: { tenant: string } }) {
    const { tenant } = params;

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
            <PlaybillExporterClient showTitle={show.title} castData={castData} />
        </div>
    );
}