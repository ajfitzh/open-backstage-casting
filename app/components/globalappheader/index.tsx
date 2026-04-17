import { cookies } from 'next/headers';
import { auth } from "@/auth";
import { getAllShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client';

export default async function GlobalHeader() {
  const session = await auth();
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // Note: Using getAllShows since getActiveShows was not exported in baserow.ts
  const shows = await getAllShows();

  const user = session?.user ? {
    name: session.user.name || "Cast Member",
    role: (session.user as any).role || "Guest",
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