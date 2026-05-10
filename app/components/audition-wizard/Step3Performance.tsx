// app/components/audition-wizard/Step3Performance.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Sparkles, Music, Volume2, FileAudio, AlertCircle } from "lucide-react";
import { AuditionFormData, PRESET_SONGS } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
  setAudioFile: (file: File | null) => void;
}

export function Step3Performance({ formData, updateForm, errors, setAudioFile }: Props) {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const togglePreview = (e: React.MouseEvent, trackId: string, url: string) => {
    e.stopPropagation(); 
    if (playingTrackId === trackId) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingTrackId(trackId);
      audioRef.current.onended = () => setPlayingTrackId(null);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">The Performance</h2>
      
      <div className="flex bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-[1.5rem] sm:rounded-[2rem]">
        <button 
          type="button" 
          onClick={() => updateForm({ usePresetSong: false, songTitle: "", musicFileName: "" })} 
          className={`flex-1 py-4 sm:py-6 rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all flex flex-col items-center gap-2 ${!formData.usePresetSong ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <UploadCloud size={24} className={!formData.usePresetSong ? "text-blue-600" : "opacity-50"} /> Upload My Own
        </button>
        <button 
          type="button" 
          onClick={() => { 
            setAudioFile(null); // <-- FIX: Clears out stale uploads
            updateForm({ usePresetSong: true, songTitle: "", musicFileName: "" }); 
          }} 
          className={`flex-1 py-4 sm:py-6 rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all flex flex-col items-center gap-2 ${formData.usePresetSong ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <Sparkles size={24} className={formData.usePresetSong ? "text-white" : "opacity-50"} /> Easy-Start Preset
        </button>
      </div>

      {formData.usePresetSong ? (
        <div id="field-songTitle" className={`space-y-6 animate-in slide-in-from-top-4 p-4 rounded-3xl ${errors.songTitle ? "bg-red-50 border border-red-200" : ""}`}>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm sm:text-base text-center max-w-xl mx-auto">
            Choose an &quot;easy-start&quot; song from the show. We will provide the backing track at your audition!
          </p>
          {errors.songTitle && <p className="text-red-500 text-sm uppercase font-black text-center animate-pulse flex justify-center items-center gap-2"><AlertCircle size={16}/>{errors.songTitle}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {PRESET_SONGS.map(s => {
              const isSelected = formData.songTitle === s.title;
              const isPlaying = playingTrackId === s.id;
              return (
                <div key={s.id} className="relative group">
                  <button type="button" onClick={() => updateForm({ songTitle: s.title })} className={`w-full p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all ${isSelected ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 hover:border-blue-400"}`}>
                    <Music size={24} className={`mb-4 ${isSelected ? "text-white" : "text-blue-600"} opacity-50`} />
                    <p className="font-black text-sm sm:text-xl uppercase italic leading-tight pr-8">{s.title}</p>
                  </button>
                  <button type="button" onClick={(e) => togglePreview(e, s.id, s.audioUrl)} className={`absolute top-4 right-4 p-3 rounded-full shadow-lg transition-all active:scale-90 z-10 ${isPlaying ? "bg-red-500 text-white animate-pulse" : isSelected ? "bg-white text-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"}`} title={isPlaying ? "Stop Preview" : "Listen to Track"}>
                    <Volume2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-top-4">
            <div id="field-songTitle">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Song Title</label>
              <input type="text" value={formData.songTitle} onChange={(e) => updateForm({ songTitle: e.target.value })} className={`w-full rounded-xl border bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 text-zinc-900 dark:text-white font-black text-xl sm:text-3xl italic outline-none shadow-inner transition-colors ${errors.songTitle ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-300 dark:border-zinc-700"}`} placeholder="E.g. On My Own" />
              {errors.songTitle && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.songTitle}</p>}
            </div>
            
            <div id="field-musicFile" className="pt-8 sm:pt-12 border-t border-zinc-100 dark:border-zinc-800">
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full p-8 sm:p-16 border-4 border-dashed rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center gap-4 sm:gap-6 transition-all ${formData.musicFileName ? "bg-green-50 border-green-500 text-green-600" : errors.musicFile ? "bg-red-50 border-red-400 text-red-500" : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-400"}`}>
                {formData.musicFileName ? (
                  <><FileAudio size={48} /><span className="font-black text-sm sm:text-2xl italic">{formData.musicFileName}</span></>
                ) : (
                  <><UploadCloud size={32} /><span className="font-black uppercase tracking-widest text-[10px] sm:text-xl text-center">Upload MP3 Backing Track</span></>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setAudioFile(e.target.files[0]); updateForm({ musicFileName: e.target.files[0].name }); } }} accept="audio/*" />
              </button>
              {errors.musicFile && <p className="text-red-500 text-[10px] uppercase font-bold mt-4 text-center flex justify-center items-center gap-1"><AlertCircle size={12}/>{errors.musicFile}</p>}
            </div>
        </div>
      )}
    </div>
  );
}