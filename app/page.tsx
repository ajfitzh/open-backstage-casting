"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveProduction } from '@/app/lib/baserow';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        const show = await getActiveProduction();
        if (show) {
            // Auto-set the active show ID
            localStorage.setItem('activeShowId', show.id.toString());
            // Redirect to the main dashboard
            router.replace('/auditions');
        } else {
            // Fallback if Baserow is empty
            alert("No active production found in database.");
        }
      } catch (e) {
        console.error(e);
      }
    }
    init();
  }, [router]);

  return (
    <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Loading Production...</h2>
    </div>
  );
}