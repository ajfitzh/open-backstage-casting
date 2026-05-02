import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { getAssignments, getShowById } from '@/app/lib/baserow';

export default async function CastListPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);
  
  const [show, assignments] = await Promise.all([
    getShowById(tenant, productionId),
    getAssignments(tenant, productionId)
  ]);

  const castList = assignments.map((assignment: any) => {
    // 🟢 SAFE EXTRACTOR
    const extractString = (val: any) => {
      if (!val) return "";
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map((item: any) => item.value || item).join(", ");
      if (typeof val === 'object') return val.value || "";
      return String(val);
    };

    let headshotUrl = null;
    const rawHeadshot = assignment.headshot || assignment.Headshot;
    if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) {
      headshotUrl = rawHeadshot[0].url;
    } else if (typeof rawHeadshot === 'string') {
      headshotUrl = rawHeadshot;
    }

    // 🟢 THE ROLE FIX: Split by " - " and grab only the first part
    const rawRole = extractString(assignment.assignment || assignment.Performance_Identity) || "Unknown Role";
    const cleanRoleName = rawRole.split(" - ")[0].trim();

    return {
      ...assignment,
      name: extractString(assignment.personName || assignment.Person) || "Unknown Actor",
      roleName: cleanRoleName,
      headshot: headshotUrl,
      email: extractString(assignment.email || assignment.Email),
      phone: extractString(assignment.phone || assignment.Phone)
    };
  });

  // 🟢 THE INITIALS FIX: Get the first letter of the first and last names
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
        {castList.map((actor: any, idx: number) => (
          <div key={`${actor.id}-${idx}`} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-900 hover:border-white/10 transition-all">
            
            {/* Avatar */}
            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5">
              {actor.headshot ? (
                <img src={actor.headshot} alt={actor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-600 tracking-wider">
                   {getInitials(actor.name)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate">{actor.name}</h3>
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