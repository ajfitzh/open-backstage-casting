// app/[tenant]/(main)/education/planning/page.tsx
import { auth } from "@/auth";
import { ShieldAlert } from "lucide-react";
import { BaserowClient } from "@/app/lib/BaserowClient";
import { isPostgresEnabled } from "@/db";
import { getClassroomPlannerDataPg } from "@/app/lib/db/reporting-repo";
import ClassPlanner from "@/app/components/education/ClassPlanner";

export const dynamic = "force-dynamic";

export default async function ClassPlanningPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return <div className="p-10 text-zinc-500">Please log in to view the planner.</div>;
  }

  const userProfile = await BaserowClient.findUserByEmail(tenant, email);
  const liveRole = userProfile?.role || "Guest";

  const allowedRoles = ["admin", "executive director", "education coordinator", "staff"];
  const hasAccess = allowedRoles.includes(liveRole.toLowerCase());

  if (!hasAccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-zinc-500 gap-4">
        <ShieldAlert size={48} className="text-red-500" />
        <h1 className="text-2xl font-black text-white">Restricted Access</h1>
        <p>Only Education Staff and Administrators can access the Planner.</p>
        <p className="text-xs font-mono bg-zinc-900 px-2 py-1 rounded">Live DB Role: {liveRole}</p>
      </div>
    );
  }

  const plannerData = isPostgresEnabled()
    ? await getClassroomPlannerDataPg(tenant)
    : null;

  if (!plannerData) {
    return (
      <div className="p-12 text-center text-zinc-500 font-bold">
        Classroom &amp; Space Planner requires PostgreSQL.
      </div>
    );
  }

  return (
    <ClassPlanner
      tenant={tenant}
      initialVenues={plannerData.venues}
      initialSpaces={plannerData.spaces}
      sessions={plannerData.sessions}
      initialClasses={plannerData.classes}
    />
  );
}
