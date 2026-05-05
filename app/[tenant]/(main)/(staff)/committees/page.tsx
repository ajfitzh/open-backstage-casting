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

  // 🛑 1. EMPTY STATE: No Active Show
  if (!show) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">🎭</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">No Active Show Found</h2>
              <p className="text-zinc-500 max-w-md">There is no active production set. Please select a production from the global header to view committee data.</p>
          </div>
      );
  }

  const [committeeData, complianceData] = await Promise.all([
      getCommitteeData(tenant, show.id),
      getComplianceData(tenant, show.id) 
  ]);

  // 🟢 SHAPE THE DATA
  const formattedVolunteers = (committeeData || []).map((v: any) => ({
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

  // 🟢 Filter out adults for accurate cast size math
  const actualCast = (complianceData || []).filter((person: any) => {
      const statusList = person[DB.PEOPLE.FIELDS.STATUS] || [];
      const isAdult = statusList.some((s: any) => 
          s.value === "Parent/Guardian" || 
          s.value === "Committee Team" || 
          s.value === "Contractor"
      );
      return !isAdult;
  });

  // 🛑 2. EMPTY STATE: No Auditions / No Volunteers Yet
  if (formattedVolunteers.length === 0 && actualCast.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  {/* Heroicon: Users */}
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">No Committee Data Yet</h2>
              <p className="text-zinc-500 max-w-md">It looks like no one has signed up or been assigned to committees for <strong>{show.title || 'this production'}</strong> yet. As families complete their onboarding waivers, they will appear here.</p>
          </div>
      );
  }

  return (
    <div className="p-6">
      <CommitteeClient 
        volunteers={formattedVolunteers} 
        students={actualCast} 
        activeId={show.id} 
      />
    </div>
  );
}