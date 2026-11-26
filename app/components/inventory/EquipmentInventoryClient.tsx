"use client";

import React, { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImagePlus,
  Lightbulb,
  Loader2,
  Package,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  Speaker,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import {
  createEquipmentItem,
  deleteEquipmentItem,
  lookupEquipmentBySku,
  updateEquipmentStatus,
} from "@/app/actions/equipment";
import CameraQrScanner from "@/app/components/production/CameraQrScanner";
import { computeCheckoutProgress } from "@/app/lib/features-helpers";

export interface EquipmentWithQr {
  id: number;
  department: string;
  sku: string;
  qrCodeValue: string;
  qrDataUrl: string;
  name: string;
  modelName: string;
  manufacturer: string;
  category: string;
  serialNumber: string;
  status: string;
  location: string;
  assignedProductionId?: number | null;
  assignedProductionTitle?: string | null;
  assignedPersonId?: number | null;
  assignedPersonName?: string | null;
  checkedOutAt?: string | null;
  photoUrl: string | null;
  notes: string;
  lastStatusUpdate: string | null;
}

interface PickerOption {
  id: number;
  title?: string;
  name?: string;
  status?: string;
}

const DEPARTMENTS = ["All", "Sound", "Lighting", "Stage", "Video"];
const STATUSES = ["Available", "Checked Out", "In Repair", "Retired"];

function statusBadgeClasses(status: string) {
  if (status === "Available") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "Checked Out") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (status === "In Repair") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-zinc-800 text-zinc-400 border-white/10";
}

export default function EquipmentInventoryClient({
  tenant,
  initialItems,
  productions = [],
  people = [],
}: {
  tenant: string;
  initialItems: EquipmentWithQr[];
  productions?: PickerOption[];
  people?: PickerOption[];
}) {
  const [items, setItems] = useState<EquipmentWithQr[]>(initialItems);
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilterId, setShowFilterId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedMatch, setScannedMatch] = useState<EquipmentWithQr | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(new Set());
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Show Load-Out / Checkout modal state
  const [checkoutTarget, setCheckoutTarget] = useState<EquipmentWithQr | null>(null);
  const [checkoutProdId, setCheckoutProdId] = useState<string>(() =>
    productions[0]?.id ? String(productions[0].id) : ""
  );
  const [checkoutPersonId, setCheckoutPersonId] = useState<string>("");
  const [checkoutLocation, setCheckoutLocation] = useState<string>("");

  // Add item form
  const [showAdd, setShowAdd] = useState(false);
  const [department, setDepartment] = useState("Sound");
  const [name, setName] = useState("");
  const [modelName, setModelName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [location, setLocation] = useState("Storage Closet");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (deptFilter !== "All" && item.department !== deptFilter) return false;
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (showFilterId > 0 && item.assignedProductionId !== showFilterId) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.modelName.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.serialNumber.toLowerCase().includes(q) ||
        (item.assignedProductionTitle || "").toLowerCase().includes(q) ||
        (item.assignedPersonName || "").toLowerCase().includes(q)
      );
    });
  }, [items, deptFilter, statusFilter, showFilterId, searchQuery]);

  const loadOutProgress = useMemo(
    () => computeCheckoutProgress(items, showFilterId > 0 ? showFilterId : null),
    [items, showFilterId]
  );

  const printableItems = useMemo(() => {
    if (selectedForPrint.size === 0) return filtered;
    return items.filter((i) => selectedForPrint.has(i.id));
  }, [items, filtered, selectedForPrint]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      sound: items.filter((i) => i.department === "Sound").length,
      lighting: items.filter((i) => i.department === "Lighting").length,
      available: items.filter((i) => i.status === "Available").length,
      checkedOut: items.filter((i) => i.status === "Checked Out").length,
      repair: items.filter((i) => i.status === "In Repair").length,
    };
  }, [items]);

  const runLookup = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setSearchQuery(clean);
    setScanError(null);
    const res = await lookupEquipmentBySku(tenant, clean);
    if (res.success) {
      setScannedMatch(res.item);
    } else {
      setScannedMatch(null);
      setScanError(res.error || "Equipment not found.");
    }
  };

  const applyUpdatedEquipment = (updated: Omit<EquipmentWithQr, "qrDataUrl">) => {
    setItems((prev) =>
      prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
    );
    if (scannedMatch?.id === updated.id) {
      setScannedMatch((prev) => (prev ? { ...prev, ...updated } : null));
    }
  };

  const handleStatusChange = async (
    id: number,
    nextStatus: string,
    assignment?: { productionId?: number | null; personId?: number | null; clearAssignment?: boolean },
    nextLocation?: string
  ) => {
    setUpdatingId(id);
    const res = await updateEquipmentStatus(tenant, id, nextStatus, nextLocation, assignment);
    setUpdatingId(null);
    if (res.success) {
      applyUpdatedEquipment(res.item);
    }
  };

  const openCheckoutModal = (item: EquipmentWithQr) => {
    setCheckoutTarget(item);
    setCheckoutProdId(
      item.assignedProductionId
        ? String(item.assignedProductionId)
        : showFilterId > 0
          ? String(showFilterId)
          : productions[0]?.id
            ? String(productions[0].id)
            : ""
    );
    setCheckoutPersonId(item.assignedPersonId ? String(item.assignedPersonId) : "");
    setCheckoutLocation(item.location || "");
  };

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    await handleStatusChange(
      checkoutTarget.id,
      "Checked Out",
      {
        productionId: checkoutProdId ? Number(checkoutProdId) : null,
        personId: checkoutPersonId ? Number(checkoutPersonId) : null,
      },
      checkoutLocation || undefined
    );
    setCheckoutTarget(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const signRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, fileType: file.type }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.uploadUrl) throw new Error(signData.error || "Upload failed.");

      const putRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Failed to store photo in DigitalOcean Spaces.");
      setPhotoUrl(signData.publicUrl);
    } catch (err: any) {
      setFormError(err?.message || "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingNew(true);
    setFormError(null);
    const res = await createEquipmentItem(tenant, {
      department,
      name,
      modelName,
      manufacturer,
      location,
      serialNumber,
      photoUrl,
      notes,
    });
    setSavingNew(false);
    if (!res.success) {
      setFormError(res.error || "Could not add gear.");
      return;
    }
    setItems((prev) => [res.item, ...prev]);
    setName("");
    setModelName("");
    setManufacturer("");
    setSerialNumber("");
    setNotes("");
    setPhotoUrl(null);
    setShowAdd(false);
  };

  const handleDelete = async (id: number) => {
    const res = await deleteEquipmentItem(tenant, id);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (scannedMatch?.id === id) setScannedMatch(null);
    }
  };

  const togglePrint = (id: number) => {
    setSelectedForPrint((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">
              Technical Production Inventory
            </p>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Wrench className="text-blue-500" size={30} />
              Sound &amp; Lighting Gear
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-200 text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Camera size={15} /> Scan QR Tag
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={printableItems.length === 0}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Printer size={15} /> Print{" "}
              {selectedForPrint.size > 0 ? `${selectedForPrint.size} Tags` : "QR Tags"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd((prev) => !prev)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
            >
              <Plus size={15} /> Add Gear
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Total Units" value={stats.total} sub={`${stats.sound} Sound • ${stats.lighting} Lighting`} />
          <StatPill label="Available" value={stats.available} accent="text-emerald-400" />
          <StatPill label="Checked Out" value={stats.checkedOut} accent="text-blue-400" />
          <StatPill label="In Repair" value={stats.repair} accent="text-amber-400" />
        </div>

        {/* Show Load-Out & Strike Return Tracker */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <ClipboardCheck size={18} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-white">
                Show Load-Out &amp; Strike Return Checklist
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {loadOutProgress.totalTracked === 0
                  ? "No gear currently assigned to a show. Scan a QR tag or click Check Out on any unit."
                  : `${loadOutProgress.returned} of ${loadOutProgress.totalTracked} assigned units returned (${loadOutProgress.checkedOut} still checked out)`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {loadOutProgress.totalTracked > 0 && (
              <div className="flex items-center gap-2.5 min-w-[160px]">
                <div className="flex-1 h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${loadOutProgress.percentReturned}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-black text-emerald-400">
                  {loadOutProgress.percentReturned}%
                </span>
              </div>
            )}

            {productions.length > 0 && (
              <select
                value={showFilterId}
                onChange={(e) => setShowFilterId(Number(e.target.value))}
                className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200"
              >
                <option value={0}>All Productions</option>
                {productions.map((p) => (
                  <option key={p.id} value={p.id}>
                    🎭 {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Filter + Search Bar */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {DEPARTMENTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeptFilter(d)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  deptFilter === d
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-white/5"
                }`}
              >
                {d}
              </button>
            ))}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ml-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs font-bold text-zinc-300"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runLookup(searchQuery);
            }}
            className="flex gap-2 flex-1 lg:max-w-md"
          >
            <div className="relative flex-1">
              <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setScanError(null);
                }}
                placeholder="Search SKU (SND-001, LGT-002), model, location..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Search size={13} /> Lookup
            </button>
          </form>
        </div>

        {scanError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300">
            {scanError}
          </div>
        )}

        {scannedMatch && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scannedMatch.qrDataUrl}
              alt={scannedMatch.sku}
              className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0"
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-blue-300">{scannedMatch.sku}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusBadgeClasses(scannedMatch.status)}`}>
                  {scannedMatch.status}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">{scannedMatch.name}</h3>
              <p className="text-xs text-zinc-400">
                {scannedMatch.department} • {scannedMatch.location || "Unassigned"}
                {scannedMatch.manufacturer ? ` • ${scannedMatch.manufacturer}` : ""}
              </p>
              {(scannedMatch.assignedProductionTitle || scannedMatch.assignedPersonName) && (
                <p className="text-xs font-bold text-blue-300">
                  Assigned: {scannedMatch.assignedProductionTitle || "Show"}
                  {scannedMatch.assignedPersonName ? ` • ${scannedMatch.assignedPersonName}` : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openCheckoutModal(scannedMatch)}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Check Out to Show
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(scannedMatch.id, "Available")}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Return to Storage
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(scannedMatch.id, "In Repair")}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-900 text-amber-300 border border-amber-500/30 hover:bg-zinc-800"
                >
                  Flag Repair
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScannedMatch(null)}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Add Gear Form */}
        {showAdd && (
          <form onSubmit={handleCreate} className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">
                Add Tech Equipment &amp; Auto-Generate QR SKU
              </h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-300">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="Sound">Sound</option>
                  <option value="Lighting">Lighting</option>
                  <option value="Stage">Stage</option>
                  <option value="Video">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Unit Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. QSC K12.2 Main Speaker #3"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Storage Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Sound Rack A"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Model Name</label>
                <input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Behringer X32"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Manufacturer</label>
                <input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. QSC, Chauvet, Shure"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Serial / Unit ID</label>
                <input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200">
                  {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} className="text-blue-400" />}
                  {photoUrl ? "Replace Photo" : "Upload Photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {photoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photoUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                )}
              </div>

              <button
                type="submit"
                disabled={savingNew}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                {savingNew ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                Save &amp; Generate QR Tag
              </button>
            </div>
          </form>
        )}

        {/* Gear Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isSelected = selectedForPrint.has(item.id);
            return (
              <div
                key={item.id}
                className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                  isSelected ? "border-blue-500 ring-1 ring-blue-500/40" : "border-white/5 hover:border-white/15"
                }`}
              >
                <div className="flex gap-3.5">
                  <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.department === "Lighting" ? (
                      <Lightbulb size={26} className="text-amber-500/60" />
                    ) : item.department === "Sound" ? (
                      <Speaker size={26} className="text-blue-500/60" />
                    ) : (
                      <Package size={26} className="text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-black text-blue-400">{item.sku}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-zinc-600 hover:text-red-400"
                        title="Delete unit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <h4 className="text-sm font-black text-white truncate">{item.name}</h4>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.manufacturer ? `${item.manufacturer} • ` : ""}
                      {item.location || "Unassigned"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusBadgeClasses(item.status)}`}>
                        <CheckCircle2 size={10} /> {item.status}
                      </span>
                      {item.assignedProductionTitle && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 max-w-[180px] truncate">
                          🎭 {item.assignedProductionTitle}
                        </span>
                      )}
                      {item.assignedPersonName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-white/10">
                          <User size={9} /> {item.assignedPersonName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 bg-white p-1 rounded-xl self-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.qrDataUrl} alt={`QR ${item.sku}`} className="w-14 h-14" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 mt-auto">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePrint(item.id)}
                      className="rounded border-zinc-700 bg-zinc-950"
                    />
                    Print tag
                  </label>

                  <div className="flex items-center gap-1.5">
                    {item.status === "Checked Out" ? (
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, "Available")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1"
                      >
                        <RotateCcw size={11} /> Return
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => openCheckoutModal(item)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase"
                      >
                        Check Out
                      </button>
                    )}

                    <select
                      disabled={updatingId === item.id}
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-zinc-200"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {scannerOpen && (
          <CameraQrScanner
            title="Tech Gear QR Scanner"
            subtitle="Scan any Sound or Lighting QR tag to check it out to a show or return it after strike."
            onScan={(decoded) => {
              setScannerOpen(false);
              void runLookup(decoded);
            }}
            onClose={() => setScannerOpen(false)}
          />
        )}

        {/* Show Load-Out / Check-Out Assignment Modal */}
        {checkoutTarget && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCheckoutTarget(null)}
          >
            <form
              onSubmit={handleConfirmCheckout}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono font-black text-blue-400">{checkoutTarget.sku}</p>
                  <h3 className="text-sm font-black text-white">Check Out: {checkoutTarget.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Assign to Production
                  </label>
                  <select
                    value={checkoutProdId}
                    onChange={(e) => setCheckoutProdId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="">No specific show</option>
                    {productions.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Assigned Cast / Crew Member
                  </label>
                  <select
                    value={checkoutPersonId}
                    onChange={(e) => setCheckoutPersonId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  >
                    <option value="">Unassigned / Booth Crew</option>
                    {people.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Venue / Placement Note
                  </label>
                  <input
                    type="text"
                    value={checkoutLocation}
                    onChange={(e) => setCheckoutLocation(e.target.value)}
                    placeholder="e.g. FOH Sound Booth, Stage Right Wing..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-zinc-900/60 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest"
                >
                  Confirm Check-Out
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Print-only QR Tag Sheet */}
      <div className="hidden print:block bg-white text-black p-4">
        <h1 className="text-lg font-bold mb-4">
          Technical Equipment QR Labels ({printableItems.length})
        </h1>
        <div className="grid grid-cols-3 gap-4">
          {printableItems.map((item) => (
            <div
              key={item.id}
              className="border border-black rounded-lg p-3 flex items-center gap-3 break-inside-avoid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.qrDataUrl} alt={item.sku} className="w-20 h-20 shrink-0" />
              <div className="min-w-0 text-xs">
                <div className="font-mono font-bold text-sm">{item.sku}</div>
                <div className="font-semibold truncate">{item.name}</div>
                <div className="text-[10px]">
                  {item.department} • {item.location || "Storage"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  sub,
  accent = "text-white",
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`text-2xl font-black mt-0.5 ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}
