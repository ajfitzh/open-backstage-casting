// app/components/global-header/index.tsx (or wherever your server component is)
import { cookies } from 'next/headers';
import { getServerSession } from "next-auth"; // <--- Import NextAuth
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // <--- Import Options
import { getAllShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client'; 

export default async function GlobalHeader() {
  // 1. Get the Active Production ID
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // 2. Fetch data
  const shows = await getAllShows();
  const session = await getServerSession(authOptions); // <--- Fetch Session

  // 3. Extract User Data (with fallbacks)
  const user = session?.user ? {
    name: session.user.name || "Cast Member",
    role: (session.user as any).role || "Guest",
    // Generate initials from name (e.g. "Austin Fitzhugh" -> "AF")
    initials: (session.user.name || "Guest")
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  } : null;

  // 4. Render Client Component
  return <GlobalHeaderClient shows={shows} activeId={activeId} user={user} />;
}