"use client";

import React, { useState } from 'react';
import {
  Plus, Trash2, CalendarClock, Theater, Users, Loader2, CheckCircle2
} from 'lucide-react';
import {
  createProduction,
  createAuditionSlot,
  deleteAuditionSlot,
  assignShowTeamMember,
  removeShowTeamMember,
} from '@/app/actions/admin';
import type { DirectoryPerson } from './SettingsClient';

export interface AuditionSlotSummary {
  id: number;
  label: string;
  capacity: number;
  taken: number;
  remaining: number;
  isFull: boolean;
}

export interface ShowTeamMemberSummary {
  id: number;
  name: string;
  role: string;
}

export interface SimpleOption {
  id: number;
  name: string;
  department?: string;
}

interface ShowLaunchPanelProps {
  tenant: string;
  activeShowId: number;
  activeShowTitle: string;
  seasons: SimpleOption[];
  masterShows: { id: number; title: string }[];
  staffPositions: SimpleOption[];
  people: DirectoryPerson[];
  initialSlots: AuditionSlotSummary[];
  initialTeam: ShowTeamMemberSummary[];
  onProductionCreated: (show: { id: number; title: string; status: string; location: string; productionFee: number }) => void;
}

export default function ShowLaunchPanel({
  tenant,
  activeShowId,
  activeShowTitle,
  seasons,
  masterShows,
  staffPositions,
  people,
  initialSlots,
  initialTeam,
  onProductionCreated,
}: ShowLaunchPanelProps) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Create Production state
  const [prodTitle, setProdTitle] = useState('');
  const [prodStatus, setProdStatus] = useState('Upcoming');
  const [prodLocation, setProdLocation] = useState('');
  const [prodFee, setProdFee] = useState('150');
  const [prodSeasonId, setProdSeasonId] = useState('');
  const [prodMasterShowId, setProdMasterShowId] = useState('');
  const [creatingProd, setCreatingProd] = useState(false);

  // 2. Audition Slots state
  const [slots, setSlots] = useState<AuditionSlotSummary[]>(initialSlots);
  const [slotLabel, setSlotLabel] = useState('');
  const [slotDateTime, setSlotDateTime] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('12');
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<number | null>(null);

  // 3. Show Team state
  const [team, setTeam] = useState<ShowTeamMemberSummary[]>(initialTeam);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [assigningTeam, setAssigningTeam] = useState(false);
  const [removingTeamId, setRemovingTeamId] = useState<number | null>(null);

  const handleCreateProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProd(true);
    setNotice(null);

    const res = await createProduction(tenant, {
      title: prodTitle,
      status: prodStatus,
      location: prodLocation,
      productionFee: Number(prodFee || 0),
      seasonId: prodSeasonId ? Number(prodSeasonId) : null,
      masterShowId: prodMasterShowId ? Number(prodMasterShowId) : null,
    });

    setCreatingProd(false);
    if (res.success && res.production) {
      onProductionCreated(res.production);
      setProdTitle('');
      setProdLocation('');
      setNotice({ type: 'success', text: `Created production "${res.production.title}".` });
    } else {
      setNotice({ type: 'error', text: res.error || 'Could not create production.' });
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSlot(true);
    setNotice(null);

    const res = await createAuditionSlot(tenant, activeShowId, {
      timeLabel: slotLabel,
      dateTime: slotDateTime || undefined,
      capacity: parseInt(slotCapacity, 10),
    });

    setCreatingSlot(false);
    if (res.success && res.slot) {
      setSlots((prev) => [...prev, res.slot!]);
      setSlotLabel('');
      setSlotDateTime('');
      setNotice({ type: 'success', text: `Added audition slot "${res.slot.label}".` });
    } else {
      setNotice({ type: 'error', text: res.error || 'Could not create audition slot.' });
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    setDeletingSlotId(slotId);
    setNotice(null);
    const res = await deleteAuditionSlot(tenant, slotId);
    setDeletingSlotId(null);

    if (res.success) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      setNotice({ type: 'success', text: 'Audition slot removed.' });
    } else {
      setNotice({ type: 'error', text: res.error || 'Could not delete audition slot.' });
    }
  };

  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const personId = Number(selectedPersonId);
    const positionId = Number(selectedPositionId);
    if (!personId || !positionId) return;

    setAssigningTeam(true);
    setNotice(null);

    const res = await assignShowTeamMember(tenant, activeShowId, personId, positionId);
    setAssigningTeam(false);

    if (res.success && res.assignmentId) {
      const person = people.find((p) => p.id === personId);
      const position = staffPositions.find((p) => p.id === positionId);
      setTeam((prev) => [
        ...prev,
        {
          id: res.assignmentId!,
          name: person?.name || 'Team Member',
          role: position?.name || 'Staff',
        },
      ]);
      setSelectedPersonId('');
      setSelectedPositionId('');
      setNotice({ type: 'success', text: `Assigned ${person?.name || 'member'} as ${position?.name || 'staff'}.` });
    } else {
      setNotice({ type: 'error', text: res.error || 'Could not assign team member.' });
    }
  };

  const handleRemoveTeam = async (assignmentId: number) => {
    setRemovingTeamId(assignmentId);
    setNotice(null);
    const res = await removeShowTeamMember(tenant, assignmentId);
    setRemovingTeamId(null);

    if (res.success) {
      setTeam((prev) => prev.filter((t) => t.id !== assignmentId));
      setNotice({ type: 'success', text: 'Removed team member from show.' });
    } else {
      setNotice({ type: 'error', text: res.error || 'Could not remove team member.' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Show Launch</h2>
        <p className="text-zinc-500 text-sm">
          Create productions, configure audition slots, and assign creative team for{' '}
          <span className="text-white font-bold">{activeShowTitle}</span>.
        </p>
      </div>

      {notice && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {notice.type === 'success' && <CheckCircle2 size={14} />}
          {notice.text}
        </div>
      )}

      {/* 1. CREATE NEW PRODUCTION */}
      <form onSubmit={handleCreateProduction} className="p-6 rounded-2xl bg-black/25 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-blue-400">
          <Theater size={16} />
          <h3 className="text-xs font-black uppercase tracking-widest">Create New Production</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Show Title *</label>
            <input
              required
              value={prodTitle}
              onChange={(e) => setProdTitle(e.target.value)}
              placeholder="e.g., The Wizard of Oz"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Initial Status</label>
            <select
              value={prodStatus}
              onChange={(e) => setProdStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Location / Venue Label</label>
            <input
              value={prodLocation}
              onChange={(e) => setProdLocation(e.target.value)}
              placeholder="e.g., Mainstage Theater"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Production Fee ($ USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prodFee}
              onChange={(e) => setProdFee(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          {seasons.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Season (Optional)</label>
              <select
                value={prodSeasonId}
                onChange={(e) => setProdSeasonId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">No season linked</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {masterShows.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Master Show Blueprint (Optional)
              </label>
              <select
                value={prodMasterShowId}
                onChange={(e) => setProdMasterShowId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">No blueprint linked</option>
                {masterShows.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creatingProd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            {creatingProd ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Production
          </button>
        </div>
      </form>

      {/* 2. AUDITION SLOTS FOR ACTIVE SHOW */}
      <div className="p-6 rounded-2xl bg-black/25 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <CalendarClock size={16} />
            <h3 className="text-xs font-black uppercase tracking-widest">
              Audition Slots — {activeShowTitle}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-zinc-500">{slots.length} Slots</span>
        </div>

        <form onSubmit={handleCreateSlot} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Time Label *</label>
            <input
              required
              value={slotLabel}
              onChange={(e) => setSlotLabel(e.target.value)}
              placeholder="e.g., Thursday 5:00 PM"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Date/Time (Optional)</label>
            <input
              type="datetime-local"
              value={slotDateTime}
              onChange={(e) => setSlotDateTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Capacity *</label>
            <input
              type="number"
              required
              min="1"
              max="500"
              value={slotCapacity}
              onChange={(e) => setSlotCapacity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creatingSlot || !activeShowId}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-colors disabled:opacity-50"
            >
              {creatingSlot ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </div>
        </form>

        <div className="space-y-2 pt-2">
          {slots.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No audition slots configured for this production yet.</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-950/70 border border-white/5"
              >
                <div>
                  <p className="text-sm font-bold text-white">{slot.label}</p>
                  <p className="text-xs text-zinc-500">
                    {slot.taken} / {slot.capacity} booked ({slot.remaining} remaining)
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletingSlotId === slot.id}
                  onClick={() => handleDeleteSlot(slot.id)}
                  aria-label={`Delete slot ${slot.label}`}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {deletingSlotId === slot.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. SHOW TEAM ASSIGNMENTS */}
      <div className="p-6 rounded-2xl bg-black/25 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
            <Users size={16} />
            <h3 className="text-xs font-black uppercase tracking-widest">
              Show Team — {activeShowTitle}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-zinc-500">{team.length} Assigned</span>
        </div>

        <form onSubmit={handleAssignTeam} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Person *</label>
            <select
              required
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-purple-500"
            >
              <option value="">Select person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.email ? `(${p.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Show Position *</label>
            <select
              required
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-purple-500"
            >
              <option value="">Select position...</option>
              {staffPositions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name} {pos.department ? `— ${pos.department}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={assigningTeam || !activeShowId}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase rounded-xl transition-colors disabled:opacity-50"
            >
              {assigningTeam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Assign
            </button>
          </div>
        </form>

        <div className="space-y-2 pt-2">
          {team.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No creative/production team assigned to this show yet.</p>
          ) : (
            team.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-950/70 border border-white/5"
              >
                <div>
                  <p className="text-sm font-bold text-white">{member.name}</p>
                  <p className="text-xs text-purple-300 font-medium">{member.role}</p>
                </div>
                <button
                  type="button"
                  disabled={removingTeamId === member.id}
                  onClick={() => handleRemoveTeam(member.id)}
                  aria-label={`Remove ${member.name}`}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {removingTeamId === member.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
