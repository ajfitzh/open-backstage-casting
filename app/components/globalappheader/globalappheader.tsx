import { cookies } from 'next/headers';
import { auth } from "@/auth";
import { getActiveProduction, getAllShows } from '@/app/lib/baserow';
import GlobalHeaderClient from './client';

export default async function GlobalHeader({ tenant }: { tenant: string }) {
  const [session, cookieStore, shows, activeProduction] = await Promise.all([
    auth(),
    cookies(),
    getAllShows(tenant),
    getActiveProduction(tenant),
  ]);

  const cookieActiveId = Number(cookieStore.get('active_production_id')?.value);
  const hasCookieShow =
    Boolean(cookieActiveId) && shows.some((s: { id: number }) => s.id === cookieActiveId);
  const activeId = hasCookieShow
    ? cookieActiveId
    : (activeProduction?.id || shows[0]?.id || 0);

  return (
    <GlobalHeaderClient
      shows={shows}
      activeId={activeId}
      user={session?.user}
    />
  );
}
