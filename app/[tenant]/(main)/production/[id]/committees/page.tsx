import { cookies } from "next/headers";
import {
  getCommitteeData,
  getActiveProduction,
  getShowById,
  getComplianceData,
  getPeople,
} from "@/app/lib/baserow";
import { DB } from "@/app/lib/schema";
import CommitteeClient from "@/app/components/committees/CommitteeClient";

export const dynamic = "force-dynamic";

export default async function CommitteesPage({
  params,
}: {
  params: Promise<{ tenant: string; id?: string }> | { tenant: string; id?: string };
}) {
  const { tenant, id } = await params;

  const cookieStore = await cookies();
  const routeId = id && id !== "active" ? Number(id) : NaN;
  const cookieId = cookieStore.get("active_production_id")?.value;
  let show = null;

  if (Number.isFinite(routeId) && routeId > 0) show = await getShowById(tenant, routeId);
  if (!show && cookieId) show = await getShowById(tenant, Number(cookieId));
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🎭</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Active Show Found</h2>
        <p className="text-zinc-400 max-w-md">
          There is no active production set. Please select a production from the global header to view committee data.
        </p>
      </div>
    );
  }

  const [committeeData, complianceData, directoryPeople] = await Promise.all([
    getCommitteeData(tenant, show.id),
    getComplianceData(tenant, show.id),
    getPeople(tenant).catch(() => []),
  ]);

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
    chairInterest: Array.isArray(v.chairInterest) ? v.chairInterest : [],
    notes: v.notes || "",
    familyKey: v.familyKey || undefined,
    assignedPreShow: v.assignedPreShow || null,
    assignedShowWeek: v.assignedShowWeek || null,
    isChair: !!v.isChair,
  }));

  const actualCast = (complianceData || []).filter((person: any) => {
    const statusList = person[DB.PEOPLE.FIELDS.STATUS] || [];
    const isAdult = statusList.some(
      (s: any) =>
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
        students={actualCast}
        activeId={show.id}
        directoryPeople={(directoryPeople || []).map((p: any) => ({
          id: Number(p.id),
          name: p.name || "Unnamed",
          email: p.email || "",
          phone: p.phone || "",
        }))}
      />
    </div>
  );
}
