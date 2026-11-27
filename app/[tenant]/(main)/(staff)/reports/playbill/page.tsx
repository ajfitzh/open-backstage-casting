// app/[tenant]/(main)/(staff)/reports/playbill/page.tsx
import { cookies } from 'next/headers';
import { fetchBaserow, getDB, getTenantTableConfig, getShowById, getActiveProduction } from '@/app/lib/baserow';
import { isPostgresEnabled } from '@/db';
import { getPlaybillDataPg } from '@/app/lib/db/operations-repo';
import PlaybillExporterClient from '@/app/components/reports/PlaybillExporterClient';

export const dynamic = 'force-dynamic';

async function getPlaybillData(tenant: string, showId: number) {
    if (isPostgresEnabled()) {
        try {
            const pgData = await getPlaybillDataPg(tenant, showId);
            if (pgData !== null) return pgData;
        } catch (error) {
            console.error("[Postgres] getPlaybillData failed, falling back:", error);
        }
    }

    try {
        const DB = getDB(tenant);
        const tables = await getTenantTableConfig(tenant);
        const F = DB.AUDITIONS.FIELDS;
        
        // Only pull people who are officially "Cast"
        const params = {
            filter_type: "AND",
            [`filter__${F.PRODUCTION}__link_row_has`]: showId,
            [`filter__${F.STATUS}__equal`]: "Cast"
        };

        const rows = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, params, tenant);
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