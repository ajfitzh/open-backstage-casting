// app/[tenant]/(main)/production/[id]/cast/page.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { getAssignments, getShowById } from '@/app/lib/baserow'; // 🟢 Removed getPeople

export default async function CastListPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);
  
  // 🟢 Removed the massive getPeople() pull to prevent 504 Timeouts
  const [show, assignments] = await Promise.all([
    getShowById(tenant, productionId),
    getAssignments(tenant, productionId)
  ]);

  // 🟢 We use the personName directly from the assignment object
  const castList = assignments.map((assignment: any) => {
    return {
      ...assignment,
      name: assignment.personName,
      roleName: assignment.assignment 
    };
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 pb-20">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-10">
        <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </Link>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2">
          {show?.title || "Unknown Show"} <span className="text-zinc-600">Cast</span>
        </h1>
        <p className="text-zinc-500 font-medium">
          {castList.length} Cast Members assigned
        </p>
      </div>

      {/* CAST GRID */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {castList.map((actor: any) => (
          <div key={actor.id + actor.roleName} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-900 hover:border-white/10 transition-all">
            
            {/* Avatar */}
            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5 flex items-center justify-center text-zinc-600">
               <User size={24} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate">{actor.name || "Unknown Actor"}</h3>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 truncate">
                {actor.roleName}
              </p>
            </div>

          </div>
        ))}
        
        {castList.length === 0 && (
           <div className="col-span-full p-12 text-center border border-dashed border-white/10 rounded-2xl">
              <h3 className="text-zinc-400 font-bold mb-2">No roles assigned yet</h3>
              <p className="text-zinc-600 text-sm">Once the director finalizes the cast list, it will appear here.</p>
           </div>
        )}
      </div>
    </div>
  );
}