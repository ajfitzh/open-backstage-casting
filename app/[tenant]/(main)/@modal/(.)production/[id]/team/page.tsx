import React from 'react';
import { getCreativeTeam, getShowById } from '@/app/lib/baserow'; 
import Modal from '@/app/components/Modal'; 

export default async function InterceptedTeamPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);
  
  const [show, team] = await Promise.all([
    getShowById(tenant, productionId),
    getCreativeTeam(tenant, productionId)
  ]);

  const teamList = team.map((member: any) => {
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

    // 🟢 BULLETPROOF TEAM EXTRACTOR
    let extractedName = extractString(member.personName || member.Person || member.person || member.name);
    let extractedRole = extractString(member.position || member.Position || member.role || member.roleName);

    if (!extractedName || !extractedRole) {
       const rawAssignment = extractString(member.assignment || member.Assignment || member.field_5847);
       if (rawAssignment) {
          const parts = rawAssignment.split(" - ");
          if (!extractedName && parts.length > 0) extractedName = parts[0].trim();
          if (!extractedRole && parts.length > 1) extractedRole = parts[1].trim();
       }
    }

    return { 
        ...member, 
        name: extractedName || "Unknown Team Member",
        roleName: extractedRole || "Unknown Role",
        headshot: headshotUrl
    };
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Modal>
      <div className="p-8 text-white">
        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">
          {show?.title} <span className="text-zinc-600">Team</span>
        </h2>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mb-6">
          {teamList.length} Members
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teamList.map((member: any, idx: number) => (
            <div key={`${member.id}-${idx}`} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
               <div className="w-10 h-10 bg-zinc-800 rounded-md overflow-hidden shrink-0">
                  {member.headshot ? (
                    <img src={member.headshot} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-zinc-600 tracking-wider">
                      {getInitials(member.name)}
                    </div>
                  )}
               </div>
               <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{member.name}</div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase truncate">{member.roleName}</div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}