import { auth } from "@/auth";
import { getFamilyMembers } from "@/app/actions/family";
import FamilyProfileClient from "@/app/components/settings/FamilyProfileClient";

export default async function FamilySettingsPage({ params }: { params: { tenant: string } }) {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return <div>Please log in.</div>;

  const familyMembers = await getFamilyMembers(params.tenant, userEmail);

  return (
     <div className="min-h-screen bg-zinc-950 p-6 pb-20">
        <FamilyProfileClient 
           tenant={params.tenant} 
           initialFamily={familyMembers} 
           userEmail={userEmail} 
        />
     </div>
  );
}