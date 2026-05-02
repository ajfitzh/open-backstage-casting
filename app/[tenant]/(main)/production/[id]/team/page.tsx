import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { getCreativeTeam, getShowById } from '@/app/lib/baserow';

export default async function TeamListPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);
  
  const [show, team] = await Promise.all([
    getShowById(tenant, productionId),
    getCreativeTeam(tenant, productionId)
  ]);

  const teamList = team.map((member: any) => {
    // 🟢 SAFE EXTRACTOR
    const extractString = (val: any) => {
      if (!val) return "";
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map((item: any) => item.value || item).join(", ");
      if (typeof val === 'object') return val.value || "";
      return String(val);
    };

    let headshotUrl = null;
    const rawHeadshot = member.headshot || member.Headshot;
    if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) {
      headshotUrl = rawHeadshot[0].url;
    } else if (typeof rawHeadshot === 'string') {
      headshotUrl = rawHeadshot;
    }

    return {
      ...member,
      name: extractString(member.personName || member.Person) || "Unknown Team Member",
      roleName: extractString(member.position || member.Position) || "Unknown Role",
      headshot: headshotUrl,
      email: extractString(member.email || member.Email),
      phone: extractString(member.phone || member.Phone)
    };
  });

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
          {show?.title} <span className="text-zinc-600">Production Team</span>
        </h1>
        <p className="text-zinc-500 font-medium">
          {teamList.length} Team Members
        </p>
      </div>

      {/* TEAM GRID */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamList.map((member: any, idx: number) => (
          <div key={`${member.id}-${idx}`} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-900 hover:border-white/10 transition-all">
            
            {/* Avatar */}
            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5">
              {member.headshot ? (
                <img src={member.headshot} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-600 tracking-wider">
                   {getInitials(member.name)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white truncate">{member.name}</h3>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 truncate">
                {member.roleName}
              </p>
              
              {/* Contacts */}
              <div className="flex flex-col gap-1">
                 {member.email && (
                   <a href={`mailto:${member.email}`} className="flex items-center text-xs text-zinc-500 hover:text-white transition-colors">
                     <Mail size={12} className="mr-1.5"/> {member.email}
                   </a>
                 )}
                 {member.phone && (
                   <div className="flex items-center text-xs text-zinc-500">
                     <Phone size={12} className="mr-1.5"/> {member.phone}
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