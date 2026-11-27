"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Plus,
  X,
  ZoomIn,
  Loader2,
  Trash2,
  Star,
  ExternalLink,
} from "lucide-react";
import {
  addGalleryPhotoAction,
  deleteGalleryPhotoAction,
  type GalleryItem,
} from "@/app/actions/gallery";

interface ShowGallerySectionProps {
  tenant: string;
  productionId: number;
  showTitle: string;
  coverImageUrl?: string | null;
  initialItems: GalleryItem[];
  canUpload?: boolean;
}

export default function ShowGallerySection({
  tenant,
  productionId,
  showTitle,
  coverImageUrl,
  initialItems,
  canUpload = false,
}: ShowGallerySectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge coverImageUrl into items if not already listed so every show with artwork has a gallery card
  const normalizedInitial: GalleryItem[] = React.useMemo(() => {
    const list = [...initialItems];
    if (coverImageUrl && !list.some((item) => item.url === coverImageUrl)) {
      list.unshift({
        id: -1,
        name: `${showTitle} — Show Poster`,
        url: coverImageUrl,
        type: "Playbill",
      });
    }
    return list;
  }, [initialItems, coverImageUrl, showTitle]);

  const [items, setItems] = useState<GalleryItem[]>(normalizedInitial);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"Playbill" | "Production Still" | "Cast Photo">("Production Still");
  const [setAsCover, setSetAsCover] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFeedback(null);

    try {
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: `tenants/${tenant}/gallery`,
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.uploadUrl || !presignData.publicUrl) {
        throw new Error(presignData.error || "Could not prepare upload.");
      }

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
          "x-amz-acl": "public-read",
        },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error("Image upload to storage failed.");
      }

      const cleanTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const saved = await addGalleryPhotoAction(tenant, productionId, {
        name: cleanTitle || `${showTitle} Photo`,
        url: presignData.publicUrl,
        type: uploadCategory,
        setAsCover,
      });

      if (!saved.ok || !saved.item) {
        throw new Error(saved.error || "Could not save photo to gallery.");
      }

      setItems((prev) => [saved.item!, ...prev]);
      setFeedback({ type: "success", text: `Uploaded "${saved.item.name}" to ${showTitle} gallery.` });
      setSetAsCover(false);
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (item.id < 0) return;
    if (!confirm(`Remove "${item.name}" from this show's gallery?`)) return;
    const res = await deleteGalleryPhotoAction(tenant, item.id);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (lightboxItem?.id === item.id) setLightboxItem(null);
      router.refresh();
    }
  };

  if (items.length === 0 && !canUpload) return null;

  return (
    <section className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <ImageIcon size={14} className="text-blue-400" />
            Playbill &amp; Production Gallery
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
              {items.length}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Scanned playbills, show posters, and production memories for {showTitle}.
          </p>
        </div>

        {canUpload && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300 outline-none focus:border-blue-500"
            >
              <option value="Playbill">Playbill</option>
              <option value="Production Still">Production Still</option>
              <option value="Cast Photo">Cast Photo</option>
            </select>
            <label className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-semibold text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={setAsCover}
                onChange={(e) => setSetAsCover(e.target.checked)}
                className="accent-blue-500"
              />
              <Star size={11} className="text-amber-400" /> Set Cover
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Photo
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-10 rounded-2xl border border-dashed border-white/10 text-center text-xs text-zinc-500">
          No playbill scans or photos uploaded for {showTitle} yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <button
              type="button"
              key={`${item.id}-${item.url}`}
              onClick={() => setLightboxItem(item)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-blue-400/50 transition-all text-left shadow-lg cursor-pointer"
            >
              {/* Subtle ambient backdrop so both wide banners and vertical playbills look framed */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-25 blur-md scale-110 pointer-events-none"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                loading="lazy"
                className="relative z-10 w-full h-full object-contain p-2.5 pb-12 group-hover:scale-[1.03] transition-transform duration-300"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none" />
              <div className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={14} />
              </div>
              <div className="absolute inset-x-0 bottom-0 z-20 p-3">
                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-[9px] font-black uppercase tracking-wider text-blue-300 mb-1">
                  {item.type}
                </span>
                <p className="text-xs font-bold text-white truncate">{item.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxItem && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[240] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.name}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90dvh] flex flex-col bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-white/10 bg-zinc-900/80 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  {lightboxItem.type}
                </span>
                <h4 className="text-sm font-bold text-white truncate">{lightboxItem.name}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Open full resolution"
                >
                  <ExternalLink size={15} />
                </a>
                {canUpload && lightboxItem.id > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(lightboxItem)}
                    className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors"
                    title="Delete from gallery"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxItem(null)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  aria-label="Close lightbox"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.url}
                alt={lightboxItem.name}
                className="max-h-[76dvh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
