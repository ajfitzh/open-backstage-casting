import React from 'react';
import { getAssignments, getShowById } from '@/app/lib/baserow';
import Modal from '@/app/components/Modal';
import ClickablePeopleGrid from '@/app/components/ClickablePeopleGrid';

export default async function InterceptedCastPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }> | { tenant: string; id: string };
}) {
  const { tenant, id } = await params;
  const productionId = parseInt(id, 10);

  const [show, assignments] = await Promise.all([
    getShowById(tenant, productionId),
    getAssignments(tenant, productionId),
  ]);

  const castList = (assignments || []).map((assignment: any) => {
    const extractString = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map((item: any) => item.value || item).join(', ');
      if (typeof val === 'object') return val.value || '';
      return String(val);
    };

    let headshotUrl = null;
    const rawHeadshot = assignment.headshot || assignment.Headshot;
    if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) {
      headshotUrl = rawHeadshot[0].url;
    } else if (typeof rawHeadshot === 'string') {
      headshotUrl = rawHeadshot;
    }

    const rawRole = extractString(assignment.assignment || assignment.Performance_Identity) || 'Unknown Role';
    const cleanRoleName = rawRole.split(' - ')[0].trim();

    return {
      id: assignment.id,
      personId: assignment.personId ? Number(assignment.personId) : null,
      name: extractString(assignment.personName || assignment.Person) || 'Unknown Actor',
      roleName: cleanRoleName,
      headshot: headshotUrl,
      email: extractString(assignment.email || assignment.Email),
      phone: extractString(assignment.phone || assignment.Phone),
    };
  });

  return (
    <Modal>
      <div className="p-8 text-white">
        <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">
          {show?.title} <span className="text-zinc-600">Cast</span>
        </h2>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mb-6">
          {castList.length} Members • Click any card for details
        </p>

        <ClickablePeopleGrid
          tenant={tenant}
          people={castList}
          roleColorClass="text-blue-400"
        />
      </div>
    </Modal>
  );
}
