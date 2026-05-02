import { cookies } from 'next/headers';
import { 
    getCommitteeData, 
    getActiveProduction, 
    getShowById, 
    getComplianceData 
} from '@/app/lib/baserow';
import CommitteeClient from '@/app/components/committees/CommitteeClient';

export const dynamic = 'force-dynamic';

export default async function CommitteesPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params;

  // Resolve Active Show
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('active_production_id')?.value;
  let show = null;
  
  if (cookieId) show = await getShowById(tenant, Number(cookieId));
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
      return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Active Show Found</div>;
  }

  // Note: Removed getCommitteePreferences as it is no longer needed in this block
  const [committeeData, complianceData] = await Promise.all([
      getCommitteeData(tenant, show.id),
      getComplianceData(tenant, show.id) 
  ]);

  // 🟢 THE FIX: 
  // Because baserow.ts now perfectly outputs the exact keys your schema generated,
  // we just do a light map here to guarantee React doesn't crash on undefined values.
  const formattedVolunteers = committeeData.map((v: any) => ({
      id: v.id,
      name: v.name || "",
      email: v.email || "",
      phone: v.phone || "",
      studentName: v.studentName || "",
      preShow1: v.preShow1 || null,
      preShow2: v.preShow2 || null,
      preShow3: v.preShow3 || null, // 🟢 3rd Choices now flow through!
      showWeek1: v.showWeek1 || null,
      showWeek2: v.showWeek2 || null,
      showWeek3: v.showWeek3 || null, // 🟢 3rd Choices now flow through!
      assignedPreShow: v.assignedPreShow || null,   // 🟢 Correctly mapped from baserow.ts
      assignedShowWeek: v.assignedShowWeek || null, // 🟢 Correctly mapped from baserow.ts
      isChair: !!v.isChair // 🟢 Safely cast to boolean
  }));

  return (
    <div className="p-6">
      <CommitteeClient 
        volunteers={formattedVolunteers} 
        students={complianceData || []} 
        activeId={show.id} 
      />
    </div>
  );
}