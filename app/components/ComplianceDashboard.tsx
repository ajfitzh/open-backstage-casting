// app/components/ComplianceDashboard.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  User,
  DollarSign,
  FileText,
  Camera,
  Ruler,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  CalendarClock,
  Hash,
  Sparkles,
  UserPlus,
  Save,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import ActorProfileModal from "./ActorProfileModal";
import {
  addWalkInAudition,
  dropOrSwapCastMember,
  updateAuditionAdmin,
} from "@/app/actions/admin-crud";
import {
  VALID_AUDITION_STATUSES,
  VALID_FEE_STATUSES,
} from "@/app/lib/admin-crud-helpers";

export interface Student {
  id: string | number;
  performerId?: number;
  name: string;
  avatar: string | null;
  status?: string;
  signedAgreement: boolean;
  paidFees: boolean;
  headshotSubmitted: boolean;
  measurementsTaken: boolean;

  // Audition Form Data
  auditionNumber?: string;
  timeSlot?: string;
  height?: string;
  hairColor?: string;
  preferredRoles?: string;
  vocalRange?: string;
  stageRomance?: boolean;
  willingToAlterAppearance?: boolean;
  conflicts?: string;
  otherTalents?: string;
  adminNotes?: string;

  [key: string]: any;
}

interface ComplianceDashboardProps {
  tenant?: string;
  productionId?: number;
  students?: Student[];
  productionTitle: string;
  auditionSlots?: { id: number; label: string }[];
  directoryPeople?: { id: number; name: string; email: string }[];
  onDeleteAudition?: (id: string | number) => void;
  onChangeTimeSlot?: (id: string | number, newSlotId: string) => void;
  onAssignMissingNumbers?: () => void;
}

export default function ComplianceDashboard({
  tenant = "",
  productionId = 0,
  students = [],
  productionTitle = "Select a Production",
  auditionSlots = [],
  directoryPeople = [],
  onDeleteAudition,
  onChangeTimeSlot,
  onAssignMissingNumbers,
}: ComplianceDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFixing, setIsFixing] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add Walk-In Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [walkInMode, setWalkInMode] = useState<"new" | "existing">("new");
  const [walkInExistingId, setWalkInExistingId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInSlotId, setWalkInSlotId] = useState("");
  const [walkInStatus, setWalkInStatus] = useState("Pending");
  const [walkInPaid, setWalkInPaid] = useState(false);
  const [walkInSigned, setWalkInSigned] = useState(false);
  const [savingWalkIn, setSavingWalkIn] = useState(false);

  // Inline Edit Drafts per expanded student
  const [editDraft, setEditDraft] = useState<{
    status: string;
    auditionNumber: string;
    paidFees: boolean;
    productionFeeStatus: string;
    signedAgreement: boolean;
    measurementsTaken: boolean;
    slotId: string;
    vocalRange: string;
    preferredRoles: string;
    otherTalents: string;
    adminNotes: string;
  } | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | number | null>(null);

  // Swap / Drop Cast Member Modal
  const [swapTarget, setSwapTarget] = useState<Student | null>(null);
  const [replacementPersonId, setReplacementPersonId] = useState("");
  const [swapping, setSwapping] = useState(false);

  const openExpandRow = (student: Student) => {
    if (expandedRowId === student.id) {
      setExpandedRowId(null);
      setEditDraft(null);
      return;
    }
    const matchedSlot = auditionSlots.find((s) => s.label === student.timeSlot);
    setExpandedRowId(student.id);
    setEditDraft({
      status: student.status || "Pending",
      auditionNumber: student.auditionNumber && student.auditionNumber !== "N/A" ? student.auditionNumber : "",
      paidFees: Boolean(student.paidFees),
      productionFeeStatus: student.paidFees ? "Paid (Manual Override)" : "Unpaid",
      signedAgreement: Boolean(student.signedAgreement),
      measurementsTaken: Boolean(student.measurementsTaken),
      slotId: matchedSlot ? String(matchedSlot.id) : "",
      vocalRange: student.vocalRange || "",
      preferredRoles: student.preferredRoles || "",
      otherTalents: student.otherTalents || "",
      adminNotes: student.adminNotes || "",
    });
  };

  const handleSaveRowOverrides = async (student: Student) => {
    if (!editDraft || !tenant || !productionId) return;
    setSavingRowId(student.id);
    setNotice(null);
    const res = await updateAuditionAdmin(tenant, productionId, Number(student.id), {
      status: editDraft.status,
      auditionNumber: editDraft.auditionNumber,
      paidFees: editDraft.paidFees,
      productionFeeStatus: editDraft.productionFeeStatus,
      signedAgreement: editDraft.signedAgreement,
      measurementsTaken: editDraft.measurementsTaken,
      slotId: editDraft.slotId ? Number(editDraft.slotId) : null,
      vocalRange: editDraft.vocalRange,
      preferredRoles: editDraft.preferredRoles,
      otherTalents: editDraft.otherTalents,
      adminNotes: editDraft.adminNotes,
    });
    setSavingRowId(null);
    if (res.success) {
      setNotice({ type: "success", text: `Updated ${student.name}.` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not update student record." });
    }
  };

  const handleQuickToggle = async (
    student: Student,
    field: "paidFees" | "signedAgreement" | "measurementsTaken"
  ) => {
    if (!tenant || !productionId) return;
    setSavingRowId(student.id);
    const nextVal = !student[field];
    const res = await updateAuditionAdmin(tenant, productionId, Number(student.id), {
      [field]: nextVal,
    });
    setSavingRowId(null);
    if (res.success) {
      setNotice({ type: "success", text: `Updated ${student.name}.` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Failed to update compliance status." });
    }
  };

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !productionId) return;
    setSavingWalkIn(true);
    setNotice(null);

    const res = await addWalkInAudition(tenant, productionId, {
      existingPersonId: walkInMode === "existing" && walkInExistingId ? Number(walkInExistingId) : undefined,
      fullName: walkInMode === "new" ? walkInName : undefined,
      email: walkInMode === "new" ? walkInEmail : undefined,
      phone: walkInMode === "new" ? walkInPhone : undefined,
      slotId: walkInSlotId ? Number(walkInSlotId) : null,
      status: walkInStatus,
      paidFees: walkInPaid,
      signedAgreement: walkInSigned,
    });

    setSavingWalkIn(false);
    if (res.success) {
      setShowAddModal(false);
      setWalkInName("");
      setWalkInEmail("");
      setWalkInPhone("");
      setWalkInExistingId("");
      setNotice({ type: "success", text: `Added student to ${productionTitle} (#${res.auditionNumber}).` });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Could not add student." });
    }
  };

  const handleDropOrSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapTarget || !tenant || !productionId) return;
    const personId = Number(swapTarget.performerId || swapTarget.id);
    setSwapping(true);
    setNotice(null);
    const res = await dropOrSwapCastMember(
      tenant,
      productionId,
      personId,
      replacementPersonId ? Number(replacementPersonId) : null
    );
    setSwapping(false);
    if (res.success) {
      setSwapTarget(null);
      setReplacementPersonId("");
      setNotice({
        type: "success",
        text: replacementPersonId
          ? `Swapped ${swapTarget.name} out and transferred ${res.rolesAffected ?? 0} role(s).`
          : `Dropped ${swapTarget.name} from cast (${res.rolesAffected ?? 0} role(s) cleared).`,
      });
      router.refresh();
    } else {
      setNotice({ type: "error", text: res.error || "Failed to update cast assignment." });
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const studentStatus = s.status || "Pending";

    if (activeTab === "Cast") return matchesSearch && studentStatus === "Cast";
    if (activeTab === "Pending") return matchesSearch && studentStatus === "Pending";
    if (activeTab === "Callbacks") return matchesSearch && studentStatus === "Called Back";
    if (activeTab === "Dropped") return matchesSearch && (studentStatus === "Dropped" || studentStatus === "Not Cast");
    return matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "cast":
        return (
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
            Cast
          </span>
        );
      case "called back":
        return (
          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-500/20">
            Callback
          </span>
        );
      case "not cast":
      case "dropped":
        return (
          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-700">
            Pending
          </span>
        );
    }
  };

  const missingNumbersCount = students.filter(
    (s) => !s.auditionNumber || s.auditionNumber.trim() === "" || s.auditionNumber === "N/A"
  ).length;

  return (
    <div className="bg-zinc-950 text-zinc-50 p-6 md:p-10 pb-32 min-h-screen font-sans">
      <header className="mb-8 border-b border-zinc-900 pb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-white">
              Master Roster
            </h1>
            <p className="text-zinc-400 mt-2 font-bold text-lg">{productionTitle}</p>
          </div>
          <div className="flex flex-wrap gap-3 items-stretch">
            {tenant && productionId > 0 && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-600/20"
              >
                <UserPlus size={16} /> Add Student / Walk-In
              </button>
            )}

            {missingNumbersCount > 0 && (
              <div className="bg-amber-900/20 border border-amber-500/30 px-5 py-2.5 rounded-2xl flex flex-col justify-center items-center shrink-0">
                <div className="text-[10px] text-amber-500 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> {missingNumbersCount} Missing #s
                </div>
                <button
                  disabled={isFixing}
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Generate and assign random unique numbers to the ${missingNumbersCount} students missing them?`
                      )
                    ) {
                      setIsFixing(true);
                      if (onAssignMissingNumbers) await onAssignMissingNumbers();
                      setIsFixing(false);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Sparkles size={12} /> {isFixing ? "Fixing..." : "Auto-Assign"}
                </button>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-2xl text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">
                Total Roster
              </div>
              <div className="text-2xl font-black text-white leading-none">{students.length}</div>
            </div>
            <div className="bg-emerald-900/20 border border-emerald-500/20 px-5 py-2.5 rounded-2xl text-center">
              <div className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest mb-1">
                Total Cast
              </div>
              <div className="text-2xl font-black text-emerald-400 leading-none">
                {students.filter((s) => s.status === "Cast").length}
              </div>
            </div>
          </div>
        </div>
      </header>

      {notice && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            notice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 w-full md:w-auto overflow-x-auto">
          {["All", "Pending", "Callbacks", "Cast", "Dropped"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search roster..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white py-3 pl-12 pr-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
          <AlertCircle className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <h3 className="text-lg font-black text-white uppercase tracking-widest">No Students Yet</h3>
          <p className="text-sm text-zinc-500 mt-2 mb-5">
            Nobody has registered for <strong className="text-zinc-300">{productionTitle}</strong> yet.
            You can manually add walk-ins or cast members right now.
          </p>
          {tenant && productionId > 0 && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest"
            >
              <UserPlus size={14} /> Add First Student
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-zinc-800 shadow-2xl bg-zinc-900/30">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-900/80 text-zinc-500 uppercase text-[10px] font-black tracking-widest border-b border-zinc-800">
              <tr>
                <th className="px-6 py-5">Performer</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-center">Agreement</th>
                <th className="px-6 py-5 text-center">Fees</th>
                <th className="px-6 py-5 text-center">Paperwork</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredStudents
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((student, index) => {
                  const isExpanded = expandedRowId === student.id;
                  const isRowBusy = savingRowId === student.id;

                  return (
                    <React.Fragment key={`${student.id}-${index}`}>
                      <tr
                        className={`hover:bg-zinc-800/40 transition-colors group ${
                          isExpanded ? "bg-zinc-800/20" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-black flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border-2 border-zinc-700 overflow-hidden shrink-0">
                            {student.avatar ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={18} />
                            )}
                          </div>
                          <div>
                            <span className="text-zinc-200 group-hover:text-white transition-colors text-base block">
                              {student.name}
                            </span>
                            <span
                              className={`text-[10px] uppercase tracking-widest font-bold ${
                                !student.auditionNumber || student.auditionNumber === "N/A"
                                  ? "text-amber-500"
                                  : "text-zinc-500"
                              }`}
                            >
                              #{student.auditionNumber || "N/A"} • {student.timeSlot || "No Slot"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">{getStatusBadge(student.status)}</td>

                        <ComplianceToggleCell
                          checked={student.signedAgreement}
                          icon={<FileText size={16} />}
                          label="Toggle Agreement Signed"
                          disabled={isRowBusy || !tenant}
                          onClick={() => handleQuickToggle(student, "signedAgreement")}
                        />
                        <ComplianceToggleCell
                          checked={student.paidFees}
                          icon={<DollarSign size={16} />}
                          label="Toggle Fees Paid"
                          disabled={isRowBusy || !tenant}
                          onClick={() => handleQuickToggle(student, "paidFees")}
                        />

                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <div
                              className={`p-1.5 rounded-full ${
                                student.headshotSubmitted
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-zinc-800 text-zinc-600"
                              }`}
                              title="Headshot"
                            >
                              <Camera size={12} />
                            </div>
                            <button
                              type="button"
                              disabled={isRowBusy || !tenant}
                              onClick={() => handleQuickToggle(student, "measurementsTaken")}
                              className={`p-1.5 rounded-full transition-colors ${
                                student.measurementsTaken
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-zinc-800 text-zinc-600 hover:text-zinc-300"
                              }`}
                              title="Click to toggle Measurements Taken"
                            >
                              <Ruler size={12} />
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="text-zinc-400 font-bold uppercase tracking-widest hover:text-white text-[10px] hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-600 shadow-sm"
                            >
                              Profile
                            </button>

                            <button
                              onClick={() => openExpandRow(student)}
                              className={`flex items-center gap-1 font-bold uppercase tracking-widest text-[10px] px-3 py-2 rounded-lg transition-colors border shadow-sm ${
                                isExpanded
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                              }`}
                            >
                              Admin {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && editDraft && (
                        <tr className="bg-black/50 border-b border-zinc-800 shadow-inner whitespace-normal">
                          <td colSpan={6} className="px-6 md:px-8 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* COLUMN 1: STATUS, SLOT & NUMBER */}
                              <div className="space-y-4">
                                <h4 className="text-blue-400 font-black uppercase tracking-widest text-xs border-b border-zinc-800 pb-2 flex items-center gap-2">
                                  <CalendarClock size={14} /> Audition &amp; Status Overrides
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] uppercase font-black text-zinc-500 block mb-1">
                                      Status
                                    </label>
                                    <select
                                      value={editDraft.status}
                                      onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}
                                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
                                    >
                                      {VALID_AUDITION_STATUSES.map((st) => (
                                        <option key={st} value={st}>
                                          {st}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase font-black text-zinc-500 block mb-1">
                                      Audition #
                                    </label>
                                    <div className="relative">
                                      <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                      <input
                                        value={editDraft.auditionNumber}
                                        onChange={(e) =>
                                          setEditDraft({ ...editDraft, auditionNumber: e.target.value })
                                        }
                                        placeholder="e.g. 42"
                                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] uppercase font-black text-zinc-500 block mb-1">
                                    Audition Time Slot
                                  </label>
                                  {auditionSlots.length > 0 ? (
                                    <select
                                      value={editDraft.slotId}
                                      onChange={(e) => setEditDraft({ ...editDraft, slotId: e.target.value })}
                                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
                                    >
                                      <option value="">Unassigned / Walk-In</option>
                                      {auditionSlots.map((slot) => (
                                        <option key={slot.id} value={slot.id}>
                                          {slot.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="flex items-center justify-between bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-800">
                                      <span className="text-xs text-zinc-300">{student.timeSlot || "No Slot"}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newSlot = prompt("Enter time slot label:", student.timeSlot || "");
                                          if (newSlot && onChangeTimeSlot) onChangeTimeSlot(student.id, newSlot);
                                        }}
                                        className="text-[10px] bg-zinc-800 px-2.5 py-1 rounded text-zinc-300 font-bold"
                                      >
                                        Move
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setSwapTarget(student)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                  >
                                    <RefreshCw size={12} /> Swap / Drop Cast
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Delete the audition record for ${student.name}? This cannot be undone.`
                                        )
                                      ) {
                                        if (onDeleteAudition) onDeleteAudition(student.id);
                                      }
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </div>

                              {/* COLUMN 2: COMPLIANCE & FEES */}
                              <div className="space-y-4">
                                <h4 className="text-emerald-400 font-black uppercase tracking-widest text-xs border-b border-zinc-800 pb-2">
                                  Compliance &amp; Payment Override
                                </h4>
                                <div className="space-y-3 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                                  <div>
                                    <label className="text-[10px] uppercase font-black text-zinc-500 block mb-1">
                                      Fee Payment Status
                                    </label>
                                    <select
                                      value={editDraft.productionFeeStatus}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditDraft({
                                          ...editDraft,
                                          productionFeeStatus: val,
                                          paidFees: val !== "Unpaid",
                                        });
                                      }}
                                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-bold text-white"
                                    >
                                      {VALID_FEE_STATUSES.map((fs) => (
                                        <option key={fs} value={fs}>
                                          {fs}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <label className="flex items-center gap-2.5 text-xs font-bold text-zinc-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editDraft.signedAgreement}
                                      onChange={(e) =>
                                        setEditDraft({ ...editDraft, signedAgreement: e.target.checked })
                                      }
                                      className="rounded bg-zinc-950 border-zinc-700 accent-emerald-500"
                                    />
                                    Agreement / Waiver Signed
                                  </label>

                                  <label className="flex items-center gap-2.5 text-xs font-bold text-zinc-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editDraft.measurementsTaken}
                                      onChange={(e) =>
                                        setEditDraft({ ...editDraft, measurementsTaken: e.target.checked })
                                      }
                                      className="rounded bg-zinc-950 border-zinc-700 accent-emerald-500"
                                    />
                                    Costume Measurements Taken
                                  </label>
                                </div>
                              </div>

                              {/* COLUMN 3: AUDITION DETAILS & NOTES */}
                              <div className="space-y-3">
                                <h4 className="text-amber-400 font-black uppercase tracking-widest text-xs border-b border-zinc-800 pb-2">
                                  Editable Audition Details
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] uppercase font-black text-zinc-500 block mb-1">
                                      Vocal Range
                                    </label>
                                    <input
                                      value={editDraft.vocalRange}
                                      onChange={(e) =>
                                        setEditDraft({ ...editDraft, vocalRange: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-black text-zinc-500 block mb-1">
                                      Pref. Roles
                                    </label>
                                    <input
                                      value={editDraft.preferredRoles}
                                      onChange={(e) =>
                                        setEditDraft({ ...editDraft, preferredRoles: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-black text-zinc-500 block mb-1">
                                    Admin Notes
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={editDraft.adminNotes}
                                    onChange={(e) =>
                                      setEditDraft({ ...editDraft, adminNotes: e.target.value })
                                    }
                                    placeholder="Cash receipt #, scholarship note, parent request..."
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                                  />
                                </div>
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    disabled={isRowBusy}
                                    onClick={() => handleSaveRowOverrides(student)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                  >
                                    {isRowBusy ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Save size={14} />
                                    )}
                                    Save Overrides
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-bold">
                    No students match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD WALK-IN / STUDENT MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleAddWalkIn}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Add Student / Walk-In to {productionTitle}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setWalkInMode("new")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${
                  walkInMode === "new" ? "bg-blue-600 text-white" : "text-zinc-400"
                }`}
              >
                New Student
              </button>
              <button
                type="button"
                onClick={() => setWalkInMode("existing")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${
                  walkInMode === "existing" ? "bg-blue-600 text-white" : "text-zinc-400"
                }`}
              >
                Existing Person ({directoryPeople.length})
              </button>
            </div>

            {walkInMode === "existing" ? (
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Select Person *
                </label>
                <select
                  required
                  value={walkInExistingId}
                  onChange={(e) => setWalkInExistingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                >
                  <option value="">Choose person...</option>
                  {directoryPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.email ? `(${p.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  required
                  placeholder="Student Full Name *"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Parent/Student Email"
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                  />
                  <input
                    placeholder="Phone"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Initial Status
                </label>
                <select
                  value={walkInStatus}
                  onChange={(e) => setWalkInStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                >
                  {VALID_AUDITION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Audition Slot (Optional)
                </label>
                <select
                  value={walkInSlotId}
                  onChange={(e) => setWalkInSlotId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                >
                  <option value="">Walk-In / No Slot</option>
                  {auditionSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walkInPaid}
                  onChange={(e) => setWalkInPaid(e.target.checked)}
                  className="accent-emerald-500"
                />
                Fees Paid
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walkInSigned}
                  onChange={(e) => setWalkInSigned(e.target.checked)}
                  className="accent-emerald-500"
                />
                Agreement Signed
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingWalkIn}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase text-white disabled:opacity-50"
              >
                {savingWalkIn ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Add to Roster
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SWAP / DROP CAST MEMBER MODAL */}
      {swapTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSwapTarget(null)}
        >
          <form
            onSubmit={handleDropOrSwap}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-400">
                Swap or Drop {swapTarget.name}
              </h3>
              <button type="button" onClick={() => setSwapTarget(null)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This sets <strong>{swapTarget.name}</strong>&apos;s status to <strong>Dropped</strong> and clears or
              transfers all of their assigned roles in this production.
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Replacement Student (Optional — leave blank to just drop)
              </label>
              <select
                value={replacementPersonId}
                onChange={(e) => setReplacementPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                <option value="">No replacement (leave roles open)</option>
                {directoryPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={swapping}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-black uppercase text-white disabled:opacity-50"
              >
                {swapping ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {replacementPersonId ? "Swap & Transfer Roles" : "Drop from Cast"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedStudent && (
        <ActorProfileModal
          actor={selectedStudent}
          grades={selectedStudent.grades}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}

const ComplianceToggleCell = ({
  checked,
  icon,
  label,
  disabled,
  onClick,
}: {
  checked: boolean;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) => {
  return (
    <td className="px-6 py-4 text-center">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`mx-auto flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 shadow-sm disabled:opacity-50 ${
          checked
            ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400"
            : "bg-zinc-900 border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-200"
        }`}
        title={label}
      >
        {checked ? <CheckCircle2 size={16} /> : icon}
      </button>
    </td>
  );
};
