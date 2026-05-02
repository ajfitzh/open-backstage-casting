import { cookies } from 'next/headers';
import { auth } from "@/auth"; 
import { getAllShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client';

// 🟢 1. Accept tenant as a prop
export default async function GlobalHeader({ tenant }: { tenant: string }) {
  // 1. Get the Session
  const session = await auth();

  // 2. Get Cookies & Data
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 🟢 2. Pass the tenant down to the fetcher!
  const shows = await getAllShows(tenant);

  // 3. Pass the user to the client safely
  return (
    <GlobalHeaderClient 
      shows={shows} 
      activeId={activeId} 
      user={session?.user} 
    />
  );
}