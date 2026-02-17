import React from 'react';
import { getAssignments, getShowById, getPeople } from '@/app/lib/baserow';
import Modal from '@/app/components/Modal'; // Import the wrapper we just made
import { Mail, Phone, User } from 'lucide-react';

export default async function InterceptedCastPage({ params }: { params: { id: string } }) {
  const productionId = parseInt(params.id);
  
  // 1. Fetch Data (Same as the full page)
  const [show, assignments, people] = await Promise.all([
    getShowById(productionId),
    getAssignments(productionId),
    getPeople() 
  ]);

  const castList = assignments.map((assignment: any) => {
    const person = people.find((p: any) => p.id === assignment.personId) || {};
    return { ...assignment, ...person, roleName: assignment.assignment };
  });

  return (
    <Modal>
      <div className="p-8 text-white">
        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">
          {show?.title} <span className="text-zinc-600">Cast</span>
        </h2>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mb-6">
          {castList.length} Members
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {castList.map((actor: any) => (
            <div key={actor.id + actor.roleName} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
               <div className="w-10 h-10 bg-zinc-800 rounded-md overflow-hidden shrink-0">
                  {actor.headshot ? (
                    <img src={actor.headshot} className="w-full h-full object-cover"/>
                  ) : <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-zinc-600"/></div>}
               </div>
               <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{actor.name}</div>
                  <div className="text-[10px] text-blue-400 font-bold uppercase truncate">{actor.roleName}</div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}