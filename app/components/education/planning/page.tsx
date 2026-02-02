import { getClasses, getVenueLogistics } from "@/app/lib/baserow";
import ClassPlanner from "@/app/components/education/ClassPlanner";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ClassPlanningPage() {
  const session = await auth();
  const role = (session?.user as any)?.role || "Guest";

  // RBAC Check
  if (!['Executive Director', 'Education Coordinator', 'Admin'].includes(role)) {
     return (
        <div className="h-screen flex flex-col items-center justify-center text-zinc-500 gap-4">
            <ShieldAlert size={48} className="text-red-500" />
            <h1 className="text-2xl font-black text-white">Restricted Access</h1>
            <p>Only Education Staff can access the Planner.</p>
        </div>
     );
  }

  const [classes, venues] = await Promise.all([
      getClasses(),
      getVenueLogistics()
  ]);

  return <ClassPlanner classes={classes} venues={venues} />;
}