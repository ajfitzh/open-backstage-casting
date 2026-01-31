import { auth } from "@/auth"; // Assuming you use NextAuth
import { redirect } from "next/navigation";
import { getAllShows, getActiveProduction, getUserProfile } from "@/app/lib/baserow";
import SettingsClient from "./SettingsClient";
import { cookies } from "next/headers";

export default async function SettingsPage() {
  const session = await auth();
  
  // 1. Security Guard
  if (!session?.user?.email) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // 2. Fetch Data in Parallel (Fast!)
  const [userProfile, allShows, activeShow] = await Promise.all([
    getUserProfile(session.user.email),
    getAllShows(),
    activeId ? { id: activeId } : getActiveProduction()
  ]);

  // Handle case where user isn't in Baserow
  if (!userProfile) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
            <div className="text-center">
                <h1 className="text-xl font-bold">Profile Not Found</h1>
                <p className="text-zinc-500">Could not find a record for {session.user.email}</p>
            </div>
        </div>
    );
  }

  // 3. Render the Client
  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-12 text-white">
      <SettingsClient 
        shows={allShows} 
        activeId={activeShow?.id || 0} 
        initialUser={userProfile} 
      />
    </div>
  );
}