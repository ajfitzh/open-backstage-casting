import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { getAssignments, getShowById, getPeople } from '@/app/lib/baserow';

export default async function CastListPage({ params }: { params: { id: string } }) {
  const productionId = parseInt(params.id);
  
  // 1. Fetch Data
  const [show, assignments, people] = await Promise.all([
    getShowById(productionId),
    getAssignments(productionId),
    getPeople() // Needed to get headshots/emails
  ]);

  // 2. Merge Assignment Data with People Data
  // We need to combine the role info (Assignment) with the contact info (People)
  const castList = assignments.map((assignment: any) => {
    const person = people.find((p: any) => p.id === assignment.personId) || {};
    return {
      ...assignment,
      ...person, // Merges name, headshot, email, etc.
      roleName: assignment.assignment // The character name (e.g. "Sky Masterson")
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
          {show?.title} <span className="text-zinc-600">Cast</span>
        </h1>
        <p className="text-zinc-500 font-medium">
          {castList.length} Cast Members found
        </p>
      </div>

      {/* CAST GRID */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {castList.map((actor: any) => (
          <div key={actor.id + actor.roleName} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-900 hover:border-white/10 transition-all">
            
            {/* Avatar */}
            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5">
              {actor.headshot ? (
                <img src={actor.headshot} alt={actor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-600 uppercase">
                   {actor.name?.substring(0,2)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate">{actor.name || "Unknown Actor"}</h3>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 truncate">
                {actor.roleName}
              </p>
              
              {/* Contacts */}
              <div className="flex flex-col gap-1">
                 {actor.email && (
                   <a href={`mailto:${actor.email}`} className="flex items-center text-xs text-zinc-500 hover:text-white transition-colors">
                     <Mail size={12} className="mr-1.5"/> {actor.email}
                   </a>
                 )}
                 {actor.phone && (
                   <div className="flex items-center text-xs text-zinc-500">
                     <Phone size={12} className="mr-1.5"/> {actor.phone}
                   </div>
                 )}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}