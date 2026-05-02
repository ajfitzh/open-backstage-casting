import React from 'react';
import { getAssignments, getShowById } from '@/app/lib/baserow';
import Modal from '@/app/components/Modal'; 
import { User } from 'lucide-react';

export default async function InterceptedCastPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);
  
  const [show, assignments] = await Promise.all([
    getShowById(tenant, productionId),
    getAssignments(tenant, productionId)
  ]);

  const castList = assignments.map((assignment: any) => {
    // 🟢 SAFE EXTRACTOR: Converts Baserow arrays/objects into clean strings
    const extractString = (val: any) => {
      if (!val) return "";
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map((item: any) => item.value || item).join(", ");
      if (typeof val === 'object') return val.value || "";
      return String(val);
    };

    // 🟢 HEADSHOT EXTRACTOR: Baserow files are arrays containing a URL
    let headshotUrl = null;
    const rawHeadshot = assignment.headshot || assignment.Headshot;
    if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) {
      headshotUrl = rawHeadshot[0].url;
    } else if (typeof rawHeadshot === 'string') {
      headshotUrl = rawHeadshot;
    }

    return { 
        ...assignment, 
        name: extractString(assignment.personName || assignment.Person) || "Unknown Actor",
        roleName: extractString(assignment.assignment || assignment.Performance_Identity) || "Unknown Role",
        headshot: headshotUrl
    };
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
          {castList.map((actor: any, idx: number) => (
            <div key={`${actor.id}-${idx}`} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
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