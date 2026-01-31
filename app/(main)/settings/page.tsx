import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { 
  getUserProfile, 
  getAllShows, 
  getActiveProduction, 
  getUserProductionRole 
} from "@/app/lib/baserow";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  
  // 1. Security Guard: Must be logged in
  if (!session?.user?.email) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get('active_production_id')?.value;
  const activeId = activeIdCookie ? Number(activeIdCookie) : null;

  // 2. Fetch Data in Parallel
  // We fetch the User, All Shows, and the Default Show (if no cookie exists)
  const [userProfile, allShows, defaultShow] = await Promise.all([
    getUserProfile(session.user.email),
    getAllShows(),
    !activeId ? getActiveProduction() : Promise.resolve(null)
  ]);

  // Determine the effective Active Show ID (Cookie > Default > 0)
  const effectiveActiveId = activeId || defaultShow?.id || 0;

  // 3. Fetch Context-Aware RBAC Role
  // "Who is this user specifically for THIS show?"
  let productionRole = null;
  
  if (userProfile && effectiveActiveId) {
      // We pass the User's Baserow ID and the Show ID to find their job title
      productionRole = await getUserProductionRole(Number(userProfile.id), effectiveActiveId);
  }

  // Handle case where user isn't in Baserow at all
  if (!userProfile) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="text-center">
                <h1 className="text-xl font-bold">Profile Not Found</h1>
                <p className="text-zinc-500">Could not find a record for {session.user.email}</p>
                <p className="text-xs text-zinc-600 mt-2">Please contact your administrator.</p>
            </div>
        </div>
    );
  }

  // 4. Render the Client
  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-12 text-white">
      <SettingsClient 
        shows={allShows} 
        activeId={effectiveActiveId} 
        initialUser={userProfile} 
        productionRole={productionRole} // 👈 Passing the specific role down
      />
    </div>
  );
}