import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getActiveShows, getFamilyMembers } from "@/app/lib/baserow"; // Import the new function
import SettingsClient from "@/app/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  // Fetch shows and family data in parallel
  const [shows, familyData] = await Promise.all([
    getActiveShows(),
    getFamilyMembers(session.user?.email)
  ]);

  // If we found data, use it. Otherwise, fallback to a guest user state.
  // (The fallback is useful if a user signs up but hasn't been added to Baserow yet)
  const userPayload = familyData || {
    name: session.user?.name || "Guest User",
    email: session.user?.email || "",
    phone: "",
    role: "Guest",
    id: "0",
    address: "",
    familyMembers: []
  };

  return (
    <SettingsClient 
      shows={shows} 
      activeId={142} // In the future, grab this from cookies()
      initialUser={userPayload} 
    />
  );
}