"use client";

import React, { useState } from "react";
import { Step1ActorInfo } from "@/app/components/audition-wizard/Step1ActorInfo";
import { Step2CastingDetails } from "@/app/components/audition-wizard/Step2CastingDetails";
import { Step3Performance } from "@/app/components/audition-wizard/Step3Performance";
import { Step5Conflicts } from "@/app/components/audition-wizard/Step5Conflicts";
import { Step6Committees } from "@/app/components/audition-wizard/Step6Committees";
import { AuditionFormData, INITIAL_DATA, PRESET_SONGS } from "@/app/components/audition-wizard/types";
import { updateAuditionDetails } from "@/app/actions/family";
import { CheckCircle2, Loader2, User, Theater, Music, CalendarOff, Users } from "lucide-react";

interface EditAuditionFormProps {
  tenant: string;
  auditionId: number;
  initialData: Partial<AuditionFormData>;
  onSuccess?: () => void;
}

const TABS = [
  { id: 1, label: "Actor", icon: User },
  { id: 2, label: "Casting", icon: Theater },
  { id: 3, label: "Music", icon: Music },
  { id: 4, label: "Conflicts", icon: CalendarOff },
  { id: 5, label: "Committees", icon: Users },
];

export default function EditAuditionForm({ tenant, auditionId, initialData, onSuccess }: EditAuditionFormProps) {
  const [formData, setFormData] = useState<AuditionFormData>({
    ...INITIAL_DATA,
    ...initialData
  });
  
  const [activeTab, setActiveTab] = useState(1);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showCommitteeGuide, setShowCommitteeGuide] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateForm = (fields: Partial<AuditionFormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
    setError(null);
    setSuccess(false);
  };

  const uploadToSpaces = async (file: File | Blob, filename: string, type: string) => {
    const res = await fetch('/api/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileType: type })
    });
    const data = await res.json();
    if (!data.uploadUrl) throw new Error("Failed to get upload URL");
    
    await fetch(data.uploadUrl, { 
      method: 'PUT', 
      body: file, 
      headers: { 'Content-Type': type, 'x-amz-acl': 'public-read' } 
    });

    return data.publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      let finalHeadshotUrl = formData.headshotUrl;
      let finalMusicUrl = formData.musicFileUrl;

      // Only upload a new headshot if they selected a new local file (data:image)
      if (formData.headshotUrl && formData.headshotUrl.startsWith('data:')) {
        const res = await fetch(formData.headshotUrl);
        const blob = await res.blob();
        finalHeadshotUrl = await uploadToSpaces(blob, `headshot-${Date.now()}.jpg`, blob.type || 'image/jpeg');
      }

      // Only upload new audio if they attached a new local file
      if (!formData.usePresetSong && audioFile) {
        finalMusicUrl = await uploadToSpaces(audioFile, audioFile.name, audioFile.type || 'audio/mpeg');
      }

      const selectedPreset = PRESET_SONGS.find(s => s.title === formData.songTitle);

      const payloadToSubmit = {
        ...formData,
        headshotUrl: finalHeadshotUrl,
        musicFileUrl: finalMusicUrl,
        practiceAudio: selectedPreset?.audioUrl || formData.practiceAudio || null,
      };

      const result = await updateAuditionDetails(tenant, auditionId, payloadToSubmit);
      
      if (result.success) {
        setSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || "Failed to update audition. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload files. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-[2rem] p-4 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[85vh]">
      
      {/* HEADER */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4 shrink-0">
        <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-white">Edit Audition Profile</h3>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">Updates lock automatically when you check in on Audition Day.</p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-6 shrink-0 custom-scrollbar mask-linear-fade">
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <t.icon size={16} className={isActive ? "text-white" : "text-zinc-400"} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* SCROLLABLE FORM CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === 1 && <Step1ActorInfo formData={formData} updateForm={updateForm} errors={{}} />}
          {activeTab === 2 && <Step2CastingDetails formData={formData} updateForm={updateForm} errors={{}} />}
          {activeTab === 3 && <Step3Performance formData={formData} updateForm={updateForm} errors={{}} setAudioFile={setAudioFile} />}
          {activeTab === 4 && <Step5Conflicts formData={formData} updateForm={updateForm} errors={{}} />}
          {activeTab === 5 && <Step6Committees formData={formData} updateForm={updateForm} errors={{}} setShowCommitteeGuide={setShowCommitteeGuide} />}
        </div>
      </div>

      {/* FOOTER / SAVE BUTTON */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
        {error && (
          <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] text-sm"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : (success ? <CheckCircle2 size={18} /> : "Save Profile Updates")}
        </button>
      </div>

      {/* MODAL OVERLAY FOR COMMITTEE GUIDE */}
      {showCommitteeGuide && (
         <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowCommitteeGuide(false)}>
           <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 shrink-0">
              <h3 className="font-black text-xl uppercase italic tracking-widest text-zinc-900 dark:text-white">Committee Guide</h3>
              <button onClick={() => setShowCommitteeGuide(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-3xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* PRE-SHOW */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4">Pre-Show Committees</h3>
                <div className="space-y-4">
                  <div><h4 className="font-bold text-blue-600 dark:text-blue-400">Sets & Set Dressing</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Build, paint, texture, and transport set pieces. Requires weekend availability leading up to tech week.</p></div>
                  <div><h4 className="font-bold text-blue-600 dark:text-blue-400">Props</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Gather, build, organize, and track all hand-held items used by actors on stage.</p></div>
                  <div><h4 className="font-bold text-blue-600 dark:text-blue-400">Costumes</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Sew, measure, alter, and organize costumes. Basic sewing skills are helpful but not strictly required!</p></div>
                  <div><h4 className="font-bold text-blue-600 dark:text-blue-400">Publicity</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Boost attendance by distributing posters, securing program ads, and promoting the show in the community.</p></div>
                </div>
              </div>

              {/* SHOW WEEK */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4">Show Week Committees</h3>
                <div className="space-y-4">
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Box Office / House</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Sell tickets at the door, hand out programs, usher patrons to their seats, and handle will-call.</p></div>
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Greenroom / Backstage</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Supervise and manage cast members in the holding areas when they are not actively on stage.</p></div>
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Ninjas / Set Movers</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Dressed in all black, move heavy set pieces swiftly and safely in the dark during scene changes.</p></div>
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Concessions & Raffles</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Set up and sell snacks, drinks, flowers, and raffle tickets in the lobby before the show and during intermission.</p></div>
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Makeup & Hair</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Assist actors with stage makeup, styling hair, and attaching wigs or specialized character prosthetics before curtain.</p></div>
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Security</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Monitor theater doors and hallways to ensure the safety of the kids and ensure only authorized personnel enter backstage.</p></div>
                  <div><h4 className="font-bold text-emerald-600 dark:text-emerald-400">Tech</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">Operate follow spots, run the light board, or assist the sound engineer. (Often requires specific training).</p></div>
                </div>
              </div>

              <button onClick={() => setShowCommitteeGuide(false)} className="w-full mt-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-colors">
                Close Guide
              </button>
            </div>
          </div>
         </div>
      )}
    </div>
  );
}