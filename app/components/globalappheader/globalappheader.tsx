import { cookies } from 'next/headers';
import { auth } from "@/auth"; // <--- NEW: Import from your root auth.ts
import { getAllShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client';

export default async function GlobalHeader() {
  // 1. Get the Session (The V5 Way)
  const session = await auth();

  // 2. Get Cookies & Data
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  const shows = await getAllShows();

  // 3. Pass the user to the client
  return (
    <GlobalHeaderClient 
      shows={shows} 
      activeId={activeId} 
      user={session?.user} // <--- Pass real user data
    />
  );
}