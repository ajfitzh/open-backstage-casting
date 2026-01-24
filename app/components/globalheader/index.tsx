import { cookies } from 'next/headers';
import { getActiveShows } from '@/app/lib/baserow'; // Keeping your path
import GlobalHeaderClient from './client';

export default async function GlobalHeader() {
  // 1. Fetch Real Data from Baserow
  const shows = await getActiveShows();
  
  // 2. Get Current Context from Cookies
  // FIX: We must 'await' the cookies() call itself now
  const cookieStore = await cookies(); 
  const activeId = Number(cookieStore.get('active_production_id')?.value || 0);

  // 3. Pass data to the interactive client component
  return <GlobalHeaderClient shows={shows} activeId={activeId} />;
}