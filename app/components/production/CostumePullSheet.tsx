"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  ClipboardCheck,
  Download,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
  Scissors,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  checkoutGarmentItem,
  createGarmentItem,
  deleteGarmentItem,
  lookupGarmentBySku,
  saveActorMeasurements,
} from "@/app/actions/wardrobe";
import { evaluateGarmentFit } from "@/app/lib/db/role-helpers";
import { computeCheckoutProgress } from "@/app/lib/features-helpers";
import CameraQrScanner from "./CameraQrScanner";

export interface CastMeasurementItem {
  personId: number;
  name: string;
  role: string;
  height: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  inseam: number | null;
  shoeSize: number | null;
  measuredAt?: string | null;
}

export interface GarmentWithQr {
  id: number;
  sku: string;
  qrCodeValue: string;
  qrDataUrl: string;
  photoUrl: string | null;
  category: string;
  binLocation: string;
  status?: string;
  assignedProductionId?: number | null;
  assignedProductionTitle?: string | null;
  assignedPersonId?: number | null;
  assignedPersonName?: string | null;
  checkedOutAt?: string | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  inseam: number | null;
  shoeSize: number | null;
  notes: string;
}

interface CostumePullSheetProps {
  tenant?: string;
  productionId?: number;
  castWithMeasurements: CastMeasurementItem[];
  showTitle: string;
  initialGarments?: GarmentWithQr[];
}

const GARMENT_CATEGORIES = [
  "Costume",
  "Dress",
  "Jacket / Coat",
  "Pants / Trousers",
  "Shirt / Blouse",
  "Hat / Headpiece",
  "Footwear",
  "Prop",
  "Accessory",
];

function parseOptionalNum(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export default function CostumePullSheet({
  tenant = "",
  productionId = 0,
  castWithMeasurements = [],
  showTitle = "Production",
  initialGarments = [],
}: CostumePullSheetProps) {
  const [activeTab, setActiveTab] = useState<"pullsheet" | "inventory">("pullsheet");
  const [castList, setCastList] = useState<CastMeasurementItem[]>(castWithMeasurements);
  const [garments, setGarments] = useState<GarmentWithQr[]>(initialGarments);

  // Pull sheet measurement editor state
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [measureDraft, setMeasureDraft] = useState({
    height: "",
    chest: "",
    waist: "",
    hips: "",
    inseam: "",
    shoeSize: "",
  });
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Inventory search / barcode scanner state
  const [scanQuery, setScanQuery] = useState("");
  const [scanResult, setScanResult] = useState<GarmentWithQr | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [searchingSku, setSearchingSku] = useState(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  // Add garment form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState("Costume");
  const [skuInput, setSkuInput] = useState("");
  const [binLocation, setBinLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [inseam, setInseam] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingGarment, setSavingGarment] = useState(false);
  const [garmentError, setGarmentError] = useState<string | null>(null);

  // Label print selection & checkout state
  const [selectedForPrint, setSelectedForPrint] = useState<Set<number>>(new Set());
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);

  const costumeLoadOutProgress = useMemo(
    () =>
      computeCheckoutProgress(
        garments.map((g) => ({
          status: g.status || "Available",
          assignedProductionId: g.assignedProductionId,
        })),
        productionId > 0 ? productionId : null
      ),
    [garments, productionId]
  );

  const handleGarmentCheckout = async (
    garmentId: number,
    nextStatus: "Checked Out" | "Available",
    assignedPersonId?: number | null
  ) => {
    if (!tenant || !productionId) return;
    setCheckingOutId(garmentId);
    const res = await checkoutGarmentItem(tenant, productionId, garmentId, {
      status: nextStatus,
      assignedProductionId: productionId,
      assignedPersonId: nextStatus === "Checked Out" ? (assignedPersonId ?? null) : null,
    });
    setCheckingOutId(null);
    if (res.success) {
      setGarments((prev) => prev.map((g) => (g.id === garmentId ? res.item : g)));
      if (scanResult?.id === garmentId) {
        setScanResult(res.item);
      }
    }
  };

  const missingCount = useMemo(
    () => castList.filter((c) => !c.height).length,
    [castList]
  );

  const filteredGarments = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q) return garments;
    return garments.filter(
      (g) =>
        g.sku.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.binLocation.toLowerCase().includes(q) ||
        g.notes.toLowerCase().includes(q)
    );
  }, [garments, scanQuery]);

  const printableGarments = useMemo(() => {
    if (selectedForPrint.size === 0) return filteredGarments;
    return garments.filter((g) => selectedForPrint.has(g.id));
  }, [garments, filteredGarments, selectedForPrint]);

  const handleExportCSV = () => {
    const headers = ["Name", "Role", "Height", "Chest", "Waist", "Hips", "Inseam", "Shoe Size"];
    const rows = castList.map((c) => [
      `"${c.name}"`,
      `"${c.role}"`,
      c.height || "MISSING",
      c.chest || "-",
      c.waist || "-",
      c.hips || "-",
      c.inseam || "-",
      c.shoeSize || "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${showTitle.replace(/\s+/g, "_")}_Costume_Pull_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditMeasurements = (actor: CastMeasurementItem) => {
    setEditingPersonId(actor.personId);
    setMeasureDraft({
      height: actor.height != null ? String(actor.height) : "",
      chest: actor.chest != null ? String(actor.chest) : "",
      waist: actor.waist != null ? String(actor.waist) : "",
      hips: actor.hips != null ? String(actor.hips) : "",
      inseam: actor.inseam != null ? String(actor.inseam) : "",
      shoeSize: actor.shoeSize != null ? String(actor.shoeSize) : "",
    });
  };

  const handleSaveMeasurements = async (personId: number) => {
    if (!tenant || !productionId) return;
    setSavingMeasure(true);
    const payload = {
      height: parseOptionalNum(measureDraft.height),
      chest: parseOptionalNum(measureDraft.chest),
      waist: parseOptionalNum(measureDraft.waist),
      hips: parseOptionalNum(measureDraft.hips),
      inseam: parseOptionalNum(measureDraft.inseam),
      shoeSize: parseOptionalNum(measureDraft.shoeSize),
    };
    const res = await saveActorMeasurements(tenant, productionId, personId, payload);
    setSavingMeasure(false);
    if (res.success) {
      setCastList((prev) =>
        prev.map((actor) =>
          actor.personId === personId
            ? { ...actor, ...payload, measuredAt: new Date().toISOString().split("T")[0] }
            : actor
        )
      );
      setEditingPersonId(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setGarmentError(null);
    try {
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, fileType: file.type }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok || !presign.uploadUrl) {
        throw new Error(presign.error || "Could not prepare upload URL.");
      }

      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload photo to storage.");
      setPhotoUrl(presign.publicUrl);
    } catch (err: any) {
      setGarmentError(err?.message || "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreateGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !productionId) return;
    setSavingGarment(true);
    setGarmentError(null);
    const res = await createGarmentItem(tenant, productionId, {
      sku: skuInput.trim() || undefined,
      category,
      binLocation,
      photoUrl,
      chest: parseOptionalNum(chest),
      waist: parseOptionalNum(waist),
      hips: parseOptionalNum(hips),
      inseam: parseOptionalNum(inseam),
      shoeSize: parseOptionalNum(shoeSize),
      notes,
    });
    setSavingGarment(false);
    if (!res.success) {
      setGarmentError(res.error || "Failed to add garment.");
      return;
    }
    setGarments((prev) => [res.item, ...prev]);
    setSkuInput("");
    setBinLocation("");
    setNotes("");
    setChest("");
    setWaist("");
    setHips("");
    setInseam("");
    setShoeSize("");
    setPhotoUrl(null);
    setShowAddForm(false);
  };

  const handleDeleteGarment = async (garmentId: number) => {
    if (!tenant || !productionId) return;
    const res = await deleteGarmentItem(tenant, productionId, garmentId);
    if (res.success) {
      setGarments((prev) => prev.filter((g) => g.id !== garmentId));
      setSelectedForPrint((prev) => {
        const next = new Set(prev);
        next.delete(garmentId);
        return next;
      });
      if (scanResult?.id === garmentId) setScanResult(null);
    }
  };

  const runSkuLookup = async (rawCode: string) => {
    const clean = rawCode.trim();
    if (!tenant || !clean) return;
    setScanQuery(clean);
    setSearchingSku(true);
    setScanError(null);
    const res = await lookupGarmentBySku(tenant, clean);
    setSearchingSku(false);
    if (res.success) {
      setScanResult(res.item);
    } else {
      setScanResult(null);
      setScanError(res.error || "Garment not found.");
    }
  };

  const handleSkuLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSkuLookup(scanQuery);
  };

  const handleCameraDecoded = (decodedText: string) => {
    setCameraScannerOpen(false);
    void runSkuLookup(decodedText);
  };

  const togglePrintSelection = (id: number) => {
    setSelectedForPrint((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Screen UI (hidden when printing QR labels) */}
      <div className="print:hidden bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header + Tabs */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 mb-1">
              <Scissors className="text-pink-500" /> Wardrobe &amp; Costume Studio
            </h2>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
              {showTitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-zinc-950 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("pullsheet")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === "pullsheet"
                    ? "bg-pink-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Scissors size={14} /> Pull Sheet ({castList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inventory")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === "inventory"
                    ? "bg-pink-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <QrCode size={14} /> Stock &amp; QR Labels ({garments.length})
              </button>
            </div>

            {activeTab === "pullsheet" ? (
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Download size={15} /> Export CSV
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={printableGarments.length === 0}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Printer size={15} /> Print{" "}
                  {selectedForPrint.size > 0
                    ? `${selectedForPrint.size} Labels`
                    : "All QR Labels"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm((prev) => !prev)}
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus size={15} /> Add Garment
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: CAST PULL SHEET & MEASUREMENTS                         */}
        {/* ============================================================ */}
        {activeTab === "pullsheet" && (
          <div className="space-y-6">
            {missingCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-xs font-bold text-amber-400">
                  {missingCount} cast {missingCount === 1 ? "member has" : "members have"} missing
                  height/measurements. Click the edit icon on any row to log measurements directly.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Actor</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-4 py-4">Height</th>
                    <th className="px-4 py-4">Chest</th>
                    <th className="px-4 py-4">Waist</th>
                    <th className="px-4 py-4">Hips</th>
                    <th className="px-4 py-4">Inseam</th>
                    <th className="px-4 py-4">Shoe</th>
                    <th className="px-4 py-4">Best Stock Match</th>
                    <th className="px-4 py-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {castList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-zinc-500">
                        No cast members or auditionees found for this production yet.
                      </td>
                    </tr>
                  ) : (
                    castList.map((actor) => {
                      const isEditing = editingPersonId === actor.personId;
                      const bestMatch = garments.find(
                        (g) => evaluateGarmentFit(g, actor).status === "Great Fit"
                      );

                      return (
                        <tr
                          key={actor.personId}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                            {actor.name}
                          </td>
                          <td className="px-5 py-4 text-pink-400 font-medium whitespace-nowrap">
                            {actor.role}
                          </td>
                          {isEditing ? (
                            <>
                              {(
                                ["height", "chest", "waist", "hips", "inseam", "shoeSize"] as const
                              ).map((field) => (
                                <td key={field} className="px-2 py-2">
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={measureDraft[field]}
                                    onChange={(e) =>
                                      setMeasureDraft((prev) => ({
                                        ...prev,
                                        [field]: e.target.value,
                                      }))
                                    }
                                    className="w-16 bg-zinc-900 border border-white/15 rounded-lg px-2 py-1 text-xs font-mono text-white"
                                    placeholder="-"
                                  />
                                </td>
                              ))}
                              <td className="px-4 py-4 text-xs text-zinc-500">Saving…</td>
                              <td className="px-4 py-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={savingMeasure}
                                    onClick={() => handleSaveMeasurements(actor.personId)}
                                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                    title="Save measurements"
                                  >
                                    {savingMeasure ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Check size={14} />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPersonId(null)}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td
                                className={`px-4 py-4 font-mono ${
                                  !actor.height ? "text-red-400 font-bold" : ""
                                }`}
                              >
                                {actor.height ? `${actor.height}"` : "Missing"}
                              </td>
                              <td className="px-4 py-4 font-mono">{actor.chest ?? "-"}</td>
                              <td className="px-4 py-4 font-mono">{actor.waist ?? "-"}</td>
                              <td className="px-4 py-4 font-mono">{actor.hips ?? "-"}</td>
                              <td className="px-4 py-4 font-mono">{actor.inseam ?? "-"}</td>
                              <td className="px-4 py-4 font-mono">{actor.shoeSize ?? "-"}</td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {bestMatch ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <Package size={12} /> {bestMatch.sku}
                                    {bestMatch.binLocation ? ` (${bestMatch.binLocation})` : ""}
                                  </span>
                                ) : (
                                  <span className="text-xs text-zinc-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => startEditMeasurements(actor)}
                                  className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                                  title="Edit actor measurements"
                                >
                                  <Pencil size={14} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: GARMENT INVENTORY & QR/BARCODE LABELS                  */}
        {/* ============================================================ */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {/* Scan / Search Bar */}
            <form
              onSubmit={handleSkuLookup}
              className="flex flex-col sm:flex-row gap-3 bg-zinc-950 border border-white/10 rounded-2xl p-4"
            >
              <div className="relative flex-1">
                <ScanLine
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-500"
                />
                <input
                  type="text"
                  value={scanQuery}
                  onChange={(e) => {
                    setScanQuery(e.target.value);
                    setScanError(null);
                  }}
                  placeholder="Scan QR / barcode or search SKU, category, rack, or bin..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                />
              </div>
              <button
                type="submit"
                disabled={searchingSku || !scanQuery.trim()}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {searchingSku ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                Lookup SKU
              </button>
              <button
                type="button"
                onClick={() => setCameraScannerOpen(true)}
                className="px-5 py-2.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-200 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <Camera size={14} /> Scan with Camera
              </button>
            </form>

            {cameraScannerOpen && (
              <CameraQrScanner
                title="Wardrobe QR Scanner"
                subtitle="Scan any garment QR tag to view measurements, check it out to a cast member, or check it back in."
                onScan={handleCameraDecoded}
                onClose={() => setCameraScannerOpen(false)}
              />
            )}

            {/* Show Costume Load-Out & Strike Return Bar */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
                  <ClipboardCheck size={16} className="text-pink-400" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white">
                    {showTitle} Costume Return Checklist
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {costumeLoadOutProgress.totalTracked === 0
                      ? "Assign garments below to a cast member to track show load-out & strike returns."
                      : `${costumeLoadOutProgress.returned} of ${costumeLoadOutProgress.totalTracked} pulled pieces returned (${costumeLoadOutProgress.checkedOut} out with cast)`}
                  </p>
                </div>
              </div>
              {costumeLoadOutProgress.totalTracked > 0 && (
                <div className="flex items-center gap-2.5 min-w-[160px]">
                  <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${costumeLoadOutProgress.percentReturned}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-400">
                    {costumeLoadOutProgress.percentReturned}%
                  </span>
                </div>
              )}
            </div>

            {scanError && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs font-bold text-amber-300">
                {scanError}
              </div>
            )}

            {scanResult && (
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scanResult.qrDataUrl}
                  alt={`QR code for ${scanResult.sku}`}
                  className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-pink-400">
                      Scanned Match
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-xs font-mono font-bold text-white">
                      {scanResult.sku}
                    </span>
                  </div>
                  <p className="text-white font-bold">
                    {scanResult.category} •{" "}
                    <span className="text-zinc-300">
                      {scanResult.binLocation || "Unassigned Bin"}
                    </span>
                  </p>
                  {scanResult.notes && (
                    <p className="text-xs text-zinc-400">{scanResult.notes}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <select
                      disabled={checkingOutId === scanResult.id}
                      value={scanResult.assignedPersonId ? String(scanResult.assignedPersonId) : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          void handleGarmentCheckout(scanResult.id, "Checked Out", Number(val));
                        }
                      }}
                      className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                    >
                      <option value="">Assign to Cast Member...</option>
                      {castList.map((actor) => (
                        <option key={actor.personId} value={String(actor.personId)}>
                          {actor.name} ({actor.role})
                        </option>
                      ))}
                    </select>
                    {scanResult.status === "Checked Out" && (
                      <button
                        type="button"
                        disabled={checkingOutId === scanResult.id}
                        onClick={() => handleGarmentCheckout(scanResult.id, "Available")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Return to Bin
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Add Garment Form */}
            {showAddForm && (
              <form
                onSubmit={handleCreateGarment}
                className="bg-zinc-950 border border-pink-500/30 rounded-2xl p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Package size={16} className="text-pink-500" /> Stock New Garment / Prop
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {garmentError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs font-bold text-red-400">
                    {garmentError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    >
                      {GARMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      SKU (optional — auto-generates if blank)
                    </label>
                    <input
                      type="text"
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      placeholder="e.g. OB-DRES-001"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Rack / Bin Location
                    </label>
                    <input
                      type="text"
                      value={binLocation}
                      onChange={(e) => setBinLocation(e.target.value)}
                      placeholder="e.g. Rack B • Bin 04"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Chest (in)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={chest}
                      onChange={(e) => setChest(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Waist (in)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Hips (in)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={hips}
                      onChange={(e) => setHips(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Inseam (in)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={inseam}
                      onChange={(e) => setInseam(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                      Shoe Size
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={shoeSize}
                      onChange={(e) => setShoeSize(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Description / Era / Care Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Velvet Victorian tailcoat, dry clean only"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                      Garment Photo (DigitalOcean Spaces)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-xs font-bold text-zinc-200 flex items-center gap-2">
                        {uploadingPhoto ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ImagePlus size={14} className="text-pink-400" />
                        )}
                        {photoUrl ? "Replace Photo" : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {photoUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={photoUrl}
                          alt="Uploaded garment preview"
                          className="w-11 h-11 rounded-lg object-cover border border-white/10"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingGarment}
                    className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    {savingGarment ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <QrCode size={14} />
                    )}
                    Save &amp; Generate QR Label
                  </button>
                </div>
              </form>
            )}

            {/* Garment Inventory Grid */}
            {filteredGarments.length === 0 ? (
              <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                <QrCode size={40} className="mx-auto text-zinc-700" />
                <h3 className="text-lg font-black text-white">No Garments Stocked Yet</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Add costumes, shoes, or props to generate instant printable QR code tags and
                  automatically match stock pieces to cast measurements.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredGarments.map((item) => {
                  const isSelected = selectedForPrint.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`bg-zinc-950 border rounded-2xl p-4 flex flex-col gap-4 transition-all ${
                        isSelected
                          ? "border-pink-500 ring-1 ring-pink-500/40"
                          : "border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Photo or QR Thumbnail */}
                        <div className="w-24 h-24 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.photoUrl}
                              alt={item.sku}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={28} className="text-zinc-700" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-black text-pink-400">
                              {item.sku}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteGarment(item.id)}
                              className="text-zinc-600 hover:text-red-400 transition-colors"
                              title="Delete garment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <h4 className="text-sm font-black text-white truncate">
                            {item.category}
                          </h4>
                          <p className="text-xs text-zinc-400 truncate">
                            {item.binLocation || "No bin location"}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-mono text-zinc-400">
                            {item.chest != null && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900">
                                C:{item.chest}&quot;
                              </span>
                            )}
                            {item.waist != null && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900">
                                W:{item.waist}&quot;
                              </span>
                            )}
                            {item.hips != null && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900">
                                H:{item.hips}&quot;
                              </span>
                            )}
                            {item.inseam != null && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900">
                                I:{item.inseam}&quot;
                              </span>
                            )}
                            {item.shoeSize != null && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900">
                                Shoe:{item.shoeSize}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Embedded QR Code */}
                        <div className="shrink-0 bg-white p-1.5 rounded-xl self-start">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.qrDataUrl}
                            alt={`QR ${item.sku}`}
                            className="w-16 h-16"
                          />
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-zinc-400 line-clamp-2 border-t border-white/5 pt-2.5">
                          {item.notes}
                        </p>
                      )}

                      {/* Show Check-Out / Cast Assignment Strip */}
                      <div className="border-t border-white/5 pt-2.5 flex flex-wrap items-center justify-between gap-2">
                        {item.status === "Checked Out" ? (
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black truncate">
                              <User size={11} />
                              {item.assignedPersonName || item.assignedProductionTitle || "Checked Out"}
                            </span>
                            <button
                              type="button"
                              disabled={checkingOutId === item.id}
                              onClick={() => handleGarmentCheckout(item.id, "Available")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1 shrink-0"
                            >
                              <RotateCcw size={10} /> Return
                            </button>
                          </div>
                        ) : (
                          <select
                            disabled={checkingOutId === item.id}
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "show-only") {
                                void handleGarmentCheckout(item.id, "Checked Out", null);
                              } else if (val) {
                                void handleGarmentCheckout(item.id, "Checked Out", Number(val));
                              }
                            }}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-zinc-300"
                          >
                            <option value="">Pull / Assign to Cast for {showTitle}...</option>
                            <option value="show-only">Check Out to Show Rack (Unassigned)</option>
                            {castList.map((actor) => (
                              <option key={actor.personId} value={String(actor.personId)}>
                                {actor.name} — {actor.role}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 mt-auto">
                        <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePrintSelection(item.id)}
                            className="rounded border-zinc-700 bg-zinc-900 text-pink-600"
                          />
                          Select for label print
                        </label>
                        <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[140px]">
                          {item.qrCodeValue}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PRINT-ONLY QR LABEL SHEET (@media print)                      */}
      {/* ============================================================ */}
      <div className="hidden print:block bg-white text-black p-4">
        <h1 className="text-lg font-bold mb-4">
          {showTitle} — Wardrobe Inventory QR Labels ({printableGarments.length})
        </h1>
        <div className="grid grid-cols-3 gap-4">
          {printableGarments.map((item) => (
            <div
              key={item.id}
              className="border border-black rounded-lg p-3 flex items-center gap-3 break-inside-avoid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.qrDataUrl} alt={item.sku} className="w-20 h-20 shrink-0" />
              <div className="min-w-0 text-xs">
                <div className="font-mono font-bold text-sm">{item.sku}</div>
                <div className="font-semibold">{item.category}</div>
                {item.binLocation && <div>Bin: {item.binLocation}</div>}
                <div className="text-[10px] mt-1 font-mono">
                  {[
                    item.chest != null ? `C:${item.chest}` : null,
                    item.waist != null ? `W:${item.waist}` : null,
                    item.hips != null ? `H:${item.hips}` : null,
                    item.inseam != null ? `I:${item.inseam}` : null,
                    item.shoeSize != null ? `Shoe:${item.shoeSize}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
