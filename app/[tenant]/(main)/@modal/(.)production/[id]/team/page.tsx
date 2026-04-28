import React from 'react';
import Link from 'next/link';
import { ArrowLeft, UserCog } from 'lucide-react';
import { getShowById, getCreativeTeam } from '@/app/lib/baserow';

export default async function TeamListPage({ params }: { params: { id: string } }) {
  const productionId = parseInt(params.id);
  
  const [show, team] = await Promise.all([
    getShowById(productionId),
    getCreativeTeam(productionId)
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 pb-20">
      
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-10">
        <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </Link>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2">
          {show?.title} <span className="text-zinc-600">Team</span>
        </h1>
        <p className="text-zinc-500 font-medium">
          {team.length} Staff Members found
        </p>
      </div>

      {/* TEAM GRID */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {team.map((member: any) => (
          <div key={member.id} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
            
            {/* Initials Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 ${member.color}`}>
              {member.initials}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate">{member.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                 <UserCog size={12} className="text-zinc-500"/>
                 <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider truncate">
                   {member.role}
                 </p>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}