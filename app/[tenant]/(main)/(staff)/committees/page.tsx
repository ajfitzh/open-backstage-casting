import { cookies } from 'next/headers';
import { 
    getCommitteeData, 
    getActiveProduction, 
    getShowById, 
    getComplianceData 
} from '@/app/lib/baserow';
import { DB } from '@/app/lib/schema';
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

  const [committeeData, complianceData] = await Promise.all([
      getCommitteeData(tenant, show.id),
      getComplianceData(tenant, show.id) 
  ]);

  // 🟢 SHAPE THE DATA: Pass perfectly mapped data to the client
  const formattedVolunteers = committeeData.map((v: any) => ({
      id: v.id,
      name: v.name || "",
      email: v.email || "",
      phone: v.phone || "",
      studentName: v.studentName || "",
      preShow1: v.preShow1 || null,
      preShow2: v.preShow2 || null,
      preShow3: v.preShow3 || null, 
      showWeek1: v.showWeek1 || null,
      showWeek2: v.showWeek2 || null,
      showWeek3: v.showWeek3 || null, 
      assignedPreShow: v.assignedPreShow || null,   
      assignedShowWeek: v.assignedShowWeek || null, 
      isChair: !!v.isChair 
  }));

  // 🟢 Filter out adults so the cast size math is perfectly accurate
  const actualCast = (complianceData || []).filter((person: any) => {
      // Grab the person's status tags using our secure schema ID
      const statusList = person[DB.PEOPLE.FIELDS.STATUS] || [];
      
      const isAdult = statusList.some((s: any) => 
          s.value === "Parent/Guardian" || 
          s.value === "Committee Team" || 
          s.value === "Contractor"
      );
      
      return !isAdult;
  });

  return (
    <div className="p-6">
      <CommitteeClient 
        volunteers={formattedVolunteers} 
        students={actualCast} // 🟢 Feed the filtered list to the UI
        activeId={show.id} 
      />
    </div>
  );
}