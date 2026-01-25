import { cookies } from 'next/headers';
import { getActiveShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client'; // Imports your 'client.tsx'

export default async function GlobalHeader() {
  // 1. Get the Active Production ID from cookies
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // 2. Fetch the list of shows for the switcher
  const shows = await getActiveShows();

  // 3. Render the Client Component with data
  return <GlobalHeaderClient shows={shows} activeId={activeId} />;
}