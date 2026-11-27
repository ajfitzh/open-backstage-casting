"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  Trash2,
  RefreshCw,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  X,
} from "lucide-react";
import { assignShowTeamMember, removeShowTeamMember } from "@/app/actions/admin";
import {
  createPersonAdmin,
  createStaffPosition,
  updateShowTeamMember,
} from "@/app/actions/admin-crud";
import PersonProfileModal, {
  type PersonCardPreview,
} from "@/app/components/PersonProfileModal";

export interface TeamMemberItem {
  id: number;
  personId?: number | null;
  positionId?: number | null;
  name: string;
  roleName: string;
  headshot: string | null;
  email: string;
  phone: string;
}

export interface PersonOption {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface StaffPositionOption {
  id: number;
  name: string;
  department?: string;
}

interface ProductionTeamManagerProps {
  tenant: string;
  productionId: number;
  showTitle: string;
  canManage: boolean;
  initialTeam: TeamMemberItem[];
  people: PersonOption[];
  staffPositions: StaffPositionOption[];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProductionTeamManager({
  tenant,
  productionId,
  showTitle,
  canManage,
  initialTeam,
  people: initialPeople,
  staffPositions: initialPositions,
}: ProductionTeamManagerProps) {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMemberItem[]>(initialTeam);
  const [people, setPeople] = useState<PersonOption[]>(initialPeople);
  const [positions, setPositions] = useState<StaffPositionOption[]>(initialPositions);

  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Swap / Edit modal state
  const [editingMember, setEditingMember] = useState<TeamMemberItem | null>(null);
  const [viewingPerson, setViewingPerson] = useState<PersonCardPreview | null>(null);
  const [swapPersonId, setSwapPersonId] = useState("");
  const [swapPositionId, setSwapPositionId] = useState("");

  // Quick-add custom position modal
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newPosName, setNewPosName] = useState("");
  const [newPosDept, setNewPosDept] = useState("Creative");

  // Quick-add new person modal
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const personId = Number(selectedPersonId);
    const positionId = Number(selectedPositionId);
    if (!personId || !positionId) return;

    setBusy(true);
    setNotice(null);
    const res = await assignShowTeamMember(tenant, productionId, personId, positionId);
    setBusy(false);

    if (res.success && res.assignmentId) {
      const person = people.find((p) => p.id === personId);
      const pos = positions.find((p) => p.id === positionId);
      setTeam((prev) => [
        ...prev,
        {
          id: res.assignmentId!,
          personId,
          positionId,
          name: person?.name || "Team Member",
          roleName: pos?.name || "Staff",
          headshot: null,
          email: person?.email || "",
          phone: person?.phone || "",
        },
      ]);
      setSelectedPersonId("");
      setSelectedPositionId("");
      setNotice({ type: "success", text: `Added ${person?.name || "member"} as ${pos?.name || "staff"}.` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not assign team member." });
    }
  };

  const handleRemove = async (member: TeamMemberItem) => {
    if (!confirm(`Remove ${member.name} (${member.roleName}) from ${showTitle}?`)) return;
    setBusyId(member.id);
    setNotice(null);
    const res = await removeShowTeamMember(tenant, member.id);
    setBusyId(null);

    if (res.success) {
      setTeam((prev) => prev.filter((m) => m.id !== member.id));
      setNotice({ type: "success", text: `Removed ${member.name} from the production team.` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not remove team member." });
    }
  };

  const openSwapModal = (member: TeamMemberItem) => {
    setEditingMember(member);
    const matchedPerson =
      people.find((p) => p.id === member.personId) ||
      people.find((p) => p.name.toLowerCase() === member.name.toLowerCase());
    const matchedPos =
      positions.find((p) => p.id === member.positionId) ||
      positions.find((p) => p.name.toLowerCase() === member.roleName.toLowerCase());
    setSwapPersonId(matchedPerson ? String(matchedPerson.id) : "");
    setSwapPositionId(matchedPos ? String(matchedPos.id) : "");
  };

  const handleSaveSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const personId = swapPersonId ? Number(swapPersonId) : undefined;
    const positionId = swapPositionId ? Number(swapPositionId) : undefined;

    setBusy(true);
    setNotice(null);
    const res = await updateShowTeamMember(tenant, productionId, editingMember.id, {
      personId,
      positionId,
    });
    setBusy(false);

    if (res.success) {
      const person = personId ? people.find((p) => p.id === personId) : null;
      const pos = positionId ? positions.find((p) => p.id === positionId) : null;
      setTeam((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                personId: person?.id ?? m.personId,
                positionId: pos?.id ?? m.positionId,
                name: person?.name ?? m.name,
                email: person?.email ?? m.email,
                phone: person?.phone ?? m.phone,
                roleName: pos?.name ?? m.roleName,
              }
            : m
        )
      );
      setEditingMember(null);
      setNotice({ type: "success", text: "Updated team assignment." });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not update team assignment." });
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosName.trim()) return;
    setBusy(true);
    const res = await createStaffPosition(tenant, newPosName, newPosDept);
    setBusy(false);
    if (res.success && "position" in res && res.position) {
      setPositions((prev) => [...prev, res.position!]);
      setSelectedPositionId(String(res.position.id));
      setNewPosName("");
      setShowNewPosition(false);
      setNotice({ type: "success", text: `Created position "${res.position.name}".` });
    } else {
      setNotice({ type: "error", text: res.error || "Could not create position." });
    }
  };

  const handleQuickCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    setBusy(true);
    const res = await createPersonAdmin(tenant, {
      fullName: newPersonName,
      email: newPersonEmail,
      phone: newPersonPhone,
      roles: ["Staff"],
    });
    setBusy(false);
    if (res.success && "person" in res && res.person) {
      const created = {
        id: res.person.id,
        name: res.person.name,
        email: res.person.email,
        phone: res.person.phone,
      };
      setPeople((prev) => [created, ...prev]);
      setSelectedPersonId(String(created.id));
      setNewPersonName("");
      setNewPersonEmail("");
      setNewPersonPhone("");
      setShowNewPerson(false);
      setNotice({ type: "success", text: `Added "${created.name}" to workspace directory.` });
    } else {
      setNotice({ type: "error", text: res.error || "Could not create person." });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link
              href={`/${tenant}`}
              className="inline-flex items-center text-zinc-500 hover:text-white mb-4 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
              {showTitle} <span className="text-zinc-600">Production Team</span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {team.length} Artistic &amp; Production Team Members
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowNewPerson((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors"
              >
                <UserPlus size={14} className="text-blue-400" /> Quick-Add Person
              </button>
              <button
                type="button"
                onClick={() => setShowNewPosition((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors"
              >
                <Briefcase size={14} className="text-purple-400" /> New Position Title
              </button>
            </div>
          )}
        </div>

        {notice && (
          <div
            className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {notice.text}
          </div>
        )}

        {/* QUICK-ADD PERSON PANEL */}
        {canManage && showNewPerson && (
          <form
            onSubmit={handleQuickCreatePerson}
            className="p-5 rounded-2xl bg-zinc-900/80 border border-blue-500/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">
                Add New Staff Person to Directory
              </h3>
              <button type="button" onClick={() => setShowNewPerson(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                required
                placeholder="Full Name *"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newPersonEmail}
                onChange={(e) => setNewPersonEmail(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              />
              <input
                placeholder="Phone (optional)"
                value={newPersonPhone}
                onChange={(e) => setNewPersonPhone(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create &amp; Select
              </button>
            </div>
          </form>
        )}

        {/* QUICK-ADD POSITION PANEL */}
        {canManage && showNewPosition && (
          <form
            onSubmit={handleCreatePosition}
            className="p-5 rounded-2xl bg-zinc-900/80 border border-purple-500/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">
                Create Custom Staff Position
              </h3>
              <button type="button" onClick={() => setShowNewPosition(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                required
                placeholder="Position Title (e.g. Assistant Choreographer) *"
                value={newPosName}
                onChange={(e) => setNewPosName(e.target.value)}
                className="md:col-span-2 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-purple-500"
              />
              <select
                value={newPosDept}
                onChange={(e) => setNewPosDept(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="Creative">Creative</option>
                <option value="Production">Production</option>
                <option value="Technical">Technical</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold uppercase text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Position
              </button>
            </div>
          </form>
        )}

        {/* ASSIGN TEAM MEMBER BAR */}
        {canManage && (
          <form
            onSubmit={handleAssign}
            className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Person *
              </label>
              <select
                required
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">Select person from directory...</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.email ? `(${p.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Show Role / Position *
              </label>
              <select
                required
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">Select position...</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} {pos.department ? `— ${pos.department}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider text-white transition-colors disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>
          </form>
        )}

        {/* TEAM GRID */}
        {team.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center text-zinc-500">
            No artistic or production team members assigned to this show yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((member, idx) => (
              <div
                key={`${member.id}-${idx}`}
                className="flex flex-col justify-between gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-900 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setViewingPerson({
                        personId: member.personId ?? null,
                        name: member.name,
                        role: member.roleName,
                        headshot: member.headshot,
                        email: member.email,
                        phone: member.phone,
                      })
                    }
                    className="w-14 h-14 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5 hover:border-emerald-400/50 transition-colors cursor-pointer"
                    title={`View ${member.name}'s profile`}
                  >
                    {member.headshot ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={member.headshot} alt={member.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-500 tracking-wider">
                        {getInitials(member.name)}
                      </div>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingPerson({
                          personId: member.personId ?? null,
                          name: member.name,
                          role: member.roleName,
                          headshot: member.headshot,
                          email: member.email,
                          phone: member.phone,
                        })
                      }
                      className="text-left max-w-full group/name cursor-pointer"
                      title={`View ${member.name}'s profile`}
                    >
                      <h3 className="font-bold text-white group-hover/name:text-blue-300 group-hover/name:underline underline-offset-2 truncate transition-colors">
                        {member.name}
                      </h3>
                    </button>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 truncate">
                      {member.roleName}
                    </p>
                    <div className="flex flex-col gap-1">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex items-center text-xs text-zinc-400 hover:text-white transition-colors truncate"
                        >
                          <Mail size={12} className="mr-1.5 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </a>
                      )}
                      {member.phone && (
                        <div className="flex items-center text-xs text-zinc-400">
                          <Phone size={12} className="mr-1.5 shrink-0" /> {member.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => openSwapModal(member)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors"
                    >
                      <RefreshCw size={12} /> Swap / Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === member.id}
                      onClick={() => handleRemove(member)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold transition-colors disabled:opacity-50"
                    >
                      {busyId === member.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PERSON PROFILE MODAL */}
      {viewingPerson && (
        <PersonProfileModal
          tenant={tenant}
          person={viewingPerson}
          onClose={() => setViewingPerson(null)}
        />
      )}

      {/* SWAP / EDIT MODAL */}
      {editingMember && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingMember(null)}
        >
          <form
            onSubmit={handleSaveSwap}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Swap or Reassign Team Slot
              </h3>
              <button type="button" onClick={() => setEditingMember(null)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Person
              </label>
              <select
                value={swapPersonId}
                onChange={(e) => setSwapPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">Keep current ({editingMember.name})</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Position
              </label>
              <select
                value={swapPositionId}
                onChange={(e) => setSwapPositionId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">Keep current ({editingMember.roleName})</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
