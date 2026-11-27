import React from 'react';
import { getCreativeTeam, getShowById } from '@/app/lib/baserow';
import Modal from '@/app/components/Modal';
import ClickablePeopleGrid from '@/app/components/ClickablePeopleGrid';

export default async function InterceptedTeamPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }> | { tenant: string; id: string };
}) {
  const { tenant, id } = await params;
  const productionId = parseInt(id, 10);

  const [show, team] = await Promise.all([
    getShowById(tenant, productionId),
    getCreativeTeam(tenant, productionId),
  ]);

  const teamList = (team || []).map((member: any) => {
    const extractString = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map((item: any) => item.value || item).join(', ');
      if (typeof val === 'object') return val.value || '';
      return String(val);
    };

    let headshotUrl = null;
    const rawHeadshot = member.headshot || member.Headshot;
    if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) {
      headshotUrl = rawHeadshot[0].url;
    } else if (typeof rawHeadshot === 'string') {
      headshotUrl = rawHeadshot;
    }

    let extractedName = extractString(member.personName || member.Person || member.person || member.name);
    let extractedRole = extractString(member.position || member.Position || member.role || member.roleName);

    if (!extractedName || !extractedRole) {
      const rawAssignment = extractString(member.assignment || member.Assignment || member.field_5847);
      if (rawAssignment) {
        const parts = rawAssignment.split(' - ');
        if (!extractedName && parts.length > 0) extractedName = parts[0].trim();
        if (!extractedRole && parts.length > 1) extractedRole = parts[1].trim();
      }
    }

    return {
      id: member.id,
      personId: member.personId ? Number(member.personId) : null,
      name: extractedName || 'Unknown Team Member',
      roleName: extractedRole || 'Unknown Role',
      headshot: headshotUrl,
      email: extractString(member.email || member.Email),
      phone: extractString(member.phone || member.Phone),
    };
  });

  return (
    <Modal>
      <div className="p-8 text-white">
        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">
          {show?.title} <span className="text-zinc-600">Team</span>
        </h2>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mb-6">
          {teamList.length} Members • Click any card for details
        </p>

        <ClickablePeopleGrid
          tenant={tenant}
          people={teamList}
          roleColorClass="text-emerald-400"
        />
      </div>
    </Modal>
  );
}
