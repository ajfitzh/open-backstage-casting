import { auth } from "@/auth";
import { ShieldAlert } from "lucide-react";
import { BaserowClient } from "@/app/lib/BaserowClient";
import ClassPlanner from "@/app/components/education/ClassPlanner";

export const dynamic = "force-dynamic";

export default async function ClassPlanningPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
     return <div className="p-10 text-zinc-500">Please log in to view the planner.</div>;
  }

  // 🟢 THE FIX: Ask Baserow for your true, live role! Don't trust the stale cookie.
  const userProfile = await BaserowClient.findUserByEmail(email);
  const liveRole = userProfile?.role || "Guest";
  
  const allowedRoles = ['admin', 'executive director', 'education coordinator'];
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

  // Fetch ALL classes cleanly
  const classes = await BaserowClient.getAllClasses();

  return <ClassPlanner classes={classes} />;
}
