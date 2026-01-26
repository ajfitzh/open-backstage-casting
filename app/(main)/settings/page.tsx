import { cookies } from 'next/headers';
import { getActiveShows } from '@/app/lib/baserow';
import SettingsClient from '@/app/components/settings/SettingsClient';

export default async function SettingsPage() {
  // 1. Fetch Real Data
  const shows = await getActiveShows();
  
  // 2. Get User Context
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value || 0);

  return (
    <div className="h-full p-6 md:p-12 overflow-hidden">
        <header className="mb-8">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">System Settings</h1>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-2">Manage your account & preferences</p>
        </header>
        
        {/* Render the Client UI */}
        <div className="h-[calc(100vh-200px)]">
            <SettingsClient shows={shows} activeId={activeId} />
        </div>
    </div>
  );
}