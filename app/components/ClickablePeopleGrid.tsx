"use client";

import React, { useState } from "react";
import PersonProfileModal, { type PersonCardPreview } from "@/app/components/PersonProfileModal";

export interface ClickablePersonItem {
  id: number | string;
  personId?: number | null;
  name: string;
  roleName: string;
  headshot?: string | null;
  email?: string;
  phone?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClickablePeopleGrid({
  tenant,
  people,
  roleColorClass = "text-emerald-400",
}: {
  tenant: string;
  people: ClickablePersonItem[];
  roleColorClass?: string;
}) {
  const [selected, setSelected] = useState<PersonCardPreview | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {people.map((member, idx) => (
          <button
            type="button"
            key={`${member.id}-${idx}`}
            onClick={() =>
              setSelected({
                personId: member.personId ?? null,
                name: member.name,
                role: member.roleName,
                headshot: member.headshot ?? null,
                email: member.email,
                phone: member.phone,
              })
            }
            className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-800/80 hover:border-white/15 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5">
              {member.headshot ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={member.headshot}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black text-zinc-500 tracking-wider">
                  {getInitials(member.name)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                {member.name}
              </div>
              <div className={`text-[10px] font-bold uppercase truncate ${roleColorClass}`}>
                {member.roleName}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <PersonProfileModal
          tenant={tenant}
          person={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
