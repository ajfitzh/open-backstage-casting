"use client";

import React, { useState } from "react";
import { Save, AlertCircle, ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateSceneLoads } from "@/app/lib/actions";
import { createShowScene, deleteShowScene, updateShowScene } from "@/app/actions/admin-crud";
import Link from "next/link";

interface Scene {
  id: number;
  name: string;
  act?: string;
  type: string;
  order: number;
  load: { music: number; dance: number; block: number };
}

export default function SceneAnalysisClient({
  tenant = "",
  productionId = 0,
  scenes,
}: {
  tenant?: string;
  productionId?: number;
  scenes: Scene[];
}) {
  const router = useRouter();
  const [localScenes, setLocalScenes] = useState<Scene[]>(scenes);
  const [saving, setSaving] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());

  // Add Scene form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAct, setNewAct] = useState("Act 1");
  const [newType, setNewType] = useState("Musical Number");
  const [busyAction, setBusyAction] = useState(false);

  // Rename scene inline
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const handleUpdate = (id: number, type: "music" | "dance" | "block", value: number) => {
    setLocalScenes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, load: { ...s.load, [type]: value } };
      })
    );
    setDirtyIds((prev) => new Set(prev).add(id));
  };

  const saveChanges = async () => {
    if (dirtyIds.size === 0) return;
    setSaving(true);

    const updates = localScenes
      .filter((s) => dirtyIds.has(s.id))
      .map((s) => ({ id: s.id, load: s.load }));

    await updateSceneLoads(updates);

    setSaving(false);
    setDirtyIds(new Set());
    router.refresh();
  };

  const handleCreateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !productionId || !newName.trim()) return;
    setBusyAction(true);
    const res = await createShowScene(tenant, productionId, {
      sceneName: newName,
      act: newAct,
      sceneType: newType,
    });
    setBusyAction(false);
    if (res.success && "scene" in res && res.scene) {
      setLocalScenes((prev) => [...prev, res.scene as Scene]);
      setNewName("");
      setShowAdd(false);
      router.refresh();
    }
  };

  const handleSaveRename = async (sceneId: number) => {
    if (!tenant || !productionId || !renameDraft.trim()) return;
    setBusyAction(true);
    const res = await updateShowScene(tenant, productionId, sceneId, {
      sceneName: renameDraft.trim(),
    });
    setBusyAction(false);
    if (res.success) {
      setLocalScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? { ...s, name: renameDraft.trim() } : s))
      );
      setRenamingId(null);
      router.refresh();
    }
  };

  const handleDeleteScene = async (scene: Scene) => {
    if (!tenant || !productionId) return;
    if (!confirm(`Delete scene "${scene.name}"?`)) return;
    setBusyAction(true);
    const res = await deleteShowScene(tenant, productionId, scene.id);
    setBusyAction(false);
    if (res.success) {
      setLocalScenes((prev) => prev.filter((s) => s.id !== scene.id));
      router.refresh();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pb-32">
      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${
          dirtyIds.size > 0
            ? "translate-y-0 opacity-100"
            : "translate-y-20 opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={saveChanges}
          disabled={saving}
          className={`px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-colors ${
            saving
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={18} /> Save {dirtyIds.size} Updates
            </>
          )}
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={tenant ? `/${tenant}` : "/"}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold w-fit"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          {tenant && productionId > 0 && (
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors"
            >
              <Plus size={14} /> Add Scene / Number
            </button>
          )}
        </div>

        {showAdd && (
          <form
            onSubmit={handleCreateScene}
            className="p-5 rounded-2xl bg-zinc-900 border border-blue-500/30 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Scene / Musical Number Name *
              </label>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Act 1 Scene 3 — Opening Number"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Act</label>
              <select
                value={newAct}
                onChange={(e) => setNewAct(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                <option value="Act 1">Act 1</option>
                <option value="Act 2">Act 2</option>
                <option value="Finale">Finale</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
              >
                <option value="Musical Number">Musical Number</option>
                <option value="Dialogue Scene">Dialogue Scene</option>
                <option value="Dance Break">Dance Break</option>
                <option value="Transition">Transition</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busyAction}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase disabled:opacity-50"
              >
                {busyAction ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>
          </form>
        )}

        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex gap-4">
          <AlertCircle className="text-blue-500 shrink-0" />
          <div>
            <h3 className="font-bold text-white">Scene Breakdown &amp; Calibration</h3>
            <p className="text-zinc-400 text-sm mt-1">
              Add, rename, or remove scenes, and drag the sliders (0–5) to estimate teaching difficulty for each scene.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {localScenes.map((scene) => (
            <div
              key={scene.id}
              className={`bg-zinc-900/50 border p-6 rounded-xl transition-all ${
                dirtyIds.has(scene.id)
                  ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex justify-between items-start gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-zinc-500">
                    #{scene.order} {scene.act ? `• ${scene.act}` : ""}
                  </span>
                  {renamingId === scene.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-blue-500 text-sm font-bold text-white flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(scene.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold text-white truncate">{scene.name}</h3>
                  )}
                  <span className="text-xs uppercase font-bold text-zinc-500">{scene.type}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dirtyIds.has(scene.id) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      Unsaved
                    </div>
                  )}
                  {tenant && productionId > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(scene.id);
                          setRenameDraft(scene.name);
                        }}
                        className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Rename scene"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScene(scene)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete scene"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Slider
                  label="Music"
                  value={scene.load.music}
                  color="bg-blue-600"
                  onChange={(v: number) => handleUpdate(scene.id, "music", v)}
                />
                <Slider
                  label="Dance"
                  value={scene.load.dance}
                  color="bg-purple-600"
                  onChange={(v: number) => handleUpdate(scene.id, "dance", v)}
                />
                <Slider
                  label="Blocking"
                  value={scene.load.block}
                  color="bg-emerald-600"
                  onChange={(v: number) => handleUpdate(scene.id, "block", v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, color, onChange }: any) {
  const descriptions = ["None", "Very Easy", "Easy", "Moderate", "Hard", "Complex"];
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-bold ${value > 0 ? "text-white" : "text-zinc-600"}`}>
          {value} - {descriptions[value]}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="5"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-${color.replace("bg-", "")}`}
      />
    </div>
  );
}
