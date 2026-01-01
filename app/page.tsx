"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSeasonsAndShows } from '@/app/lib/baserow';
export default function LaunchPage() {
  const router = useRouter();
  const [data, setData] = useState<{seasons: string[], productions: any[]}>({seasons: [], productions: []});
  const [selection, setSelection] = useState({ season: '', showId: '' });

  useEffect(() => {
    getSeasonsAndShows().then(setData);
  }, []);

  const handleLaunch = () => {
    // Save to localStorage so other pages can see the "Active Show"
    localStorage.setItem('activeShowId', selection.showId);
    // Redirect to the Auditions dashboard
    router.push('/auditions');
  };

  const filteredShows = data.productions.filter(p => p.Season?.value === selection.season);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6">
      <div className="w-full max-w-md space-y-8 bg-zinc-900 p-8 rounded-3xl border border-white/10 shadow-2xl">
        <header className="text-center">
          <h1 className="text-4xl font-black italic text-blue-500 uppercase">Casting Portal</h1>
          <p className="text-zinc-400 mt-2">Select your production to begin</p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Season</label>
            <select 
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white focus:border-blue-500 outline-none"
              onChange={(e) => setSelection({ ...selection, season: e.target.value })}
            >
              <option value="">Select Season...</option>
              {data.seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Show</label>
            <select 
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white focus:border-blue-500 outline-none disabled:opacity-30"
              disabled={!selection.season}
              onChange={(e) => setSelection({ ...selection, showId: e.target.value })}
            >
              <option value="">Select Show...</option>
              {filteredShows.map(p => <option key={p.id} value={p.id}>{p.Title}</option>)}
            </select>
          </div>

          <button 
            onClick={handleLaunch}
            disabled={!selection.showId}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-black uppercase rounded-xl transition-all"
          >
            Launch Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}