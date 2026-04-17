import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { 
  getUserProfile, 
  getAllShows, 
  getActiveProduction, 
  getUserProductionRole 
} from "@/app/lib/baserow";
import SettingsClient from "@/app/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get('active_production_id')?.value;
  const activeId = activeIdCookie ? Number(activeIdCookie) : null;

  const [userProfile, allShows, defaultShow] = await Promise.all([
    getUserProfile(session.user.email),
    getAllShows(),
    !activeId ? getActiveProduction() : Promise.resolve(null)
  ]);

  const effectiveActiveId = activeId || defaultShow?.id || 0;

  let productionRole = null;
  
  if (userProfile && effectiveActiveId) {
      productionRole = await getUserProductionRole(Number(userProfile.id), effectiveActiveId);
  }

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

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-12 text-white">
      <SettingsClient 
        shows={allShows} 
        activeId={effectiveActiveId} 
        initialUser={userProfile} 
        realProductionRole={productionRole} 
      />
    </div>
  );
}