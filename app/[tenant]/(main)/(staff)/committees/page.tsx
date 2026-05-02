import { cookies } from 'next/headers';
import { 
    getCommitteeData, 
    getActiveProduction, 
    getShowById, 
    getCommitteePreferences, 
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
  
  if (cookieId) show = await getShowById(tenant, cookieId);
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
      return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Active Show Found</div>;
  }

  const [committeeData, preferences, complianceData] = await Promise.all([
      getCommitteeData(tenant, show.id),
      getCommitteePreferences(tenant),
      getComplianceData(tenant, show.id) 
  ]);

  // 🟢 SHAPE THE DATA: Ensure it perfectly matches the 'Volunteer' interface
  const formattedVolunteers = committeeData.map((v: any) => ({
      id: v.id,
      name: v.name || "",
      email: v.email || "",
      phone: v.phone || "",
      studentName: v.studentName || "",
      preShow1: v.preShow1 || null,
      preShow2: v.preShow2 || null,
      preShow3: null, // Fallback if missing from DB
      showWeek1: v.showWeek1 || null,
      showWeek2: v.showWeek2 || null,
      showWeek3: null, // Fallback if missing from DB
      assignedPreShow: v.preShowPhase || null, 
      assignedShowWeek: v.assigned || null, // Using the generic 'assigned' from baserow.ts
      isChair: v.isChair === true || v.isChair === "true" || false
  }));

  return (
    <div className="p-6">
      <CommitteeClient 
        volunteers={formattedVolunteers} 
        students={complianceData} 
        activeId={show.id} 
      />
    </div>
  );
}