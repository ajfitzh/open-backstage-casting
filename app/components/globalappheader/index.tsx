// app/components/global-header/index.tsx
import { cookies } from 'next/headers';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getActiveShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client'; 

export default async function GlobalHeader() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  const shows = await getActiveShows();
  const session = await getServerSession(authOptions);

  // Extract User Data including the Image
  const user = session?.user ? {
    name: session.user.name || "Cast Member",
    role: (session.user as any).role || "Guest",
    // Pass the image URL from the session (which comes from Baserow if your auth is set up that way)
    image: session.user.image || null, 
    initials: (session.user.name || "Guest")
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  } : null;

  return <GlobalHeaderClient shows={shows} activeId={activeId} user={user} />;
}