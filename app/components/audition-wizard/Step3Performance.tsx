// app/components/audition-wizard/Step3Performance.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Sparkles, Music, Volume2, FileAudio, AlertCircle, Mic2, Info } from "lucide-react";
import { AuditionFormData, PRESET_SONGS } from "./types";
import VocalRangeTester from "./VocalRangeTester";

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

  const scrollToNext = (id: string) => {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

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

  const handleStartTest = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">The Performance</h2>
      
      {/* --- BACKING TRACK SECTION --- */}
      <div className="flex bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-[1.5rem] sm:rounded-[2rem]">
        <button 
          type="button" 
          onClick={() => { updateForm({ usePresetSong: false, songTitle: "", musicFileName: "" }); scrollToNext('field-songTitle'); }} 
          className={`flex-1 py-4 sm:py-6 rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all flex flex-col items-center gap-2 ${!formData.usePresetSong ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <UploadCloud size={24} className={!formData.usePresetSong ? "text-blue-600" : "opacity-50"} /> Upload My Own
        </button>
        <button 
          type="button" 
          onClick={() => { 
            setAudioFile(null); 
            updateForm({ usePresetSong: true, songTitle: "", musicFileName: "" }); 
            scrollToNext('field-songTitle');
          }} 
          className={`flex-1 py-4 sm:py-6 rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] sm:text-sm transition-all flex flex-col items-center gap-2 ${formData.usePresetSong ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <Sparkles size={24} className={formData.usePresetSong ? "text-white" : "opacity-50"} /> Easy-Start Preset
        </button>
      </div>

      {formData.usePresetSong ? (
        <div id="field-songTitle" className={`space-y-6 animate-in slide-in-from-top-4 p-4 rounded-3xl scroll-mt-24 ${errors.songTitle ? "bg-red-50 border border-red-200" : ""}`}>
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
                  <button type="button" onClick={() => { updateForm({ songTitle: s.title }); scrollToNext('field-vocalRange'); }} className={`w-full p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all ${isSelected ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 hover:border-blue-400"}`}>
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
            <div id="field-songTitle" className="scroll-mt-24">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Song Title</label>
              <input type="text" required value={formData.songTitle} onChange={(e) => updateForm({ songTitle: e.target.value })} className={`w-full rounded-xl border bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 text-zinc-900 dark:text-white font-black text-xl sm:text-3xl italic outline-none shadow-inner transition-colors ${errors.songTitle ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-zinc-300 dark:border-zinc-700"}`} placeholder="E.g. On My Own" />
              {errors.songTitle && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.songTitle}</p>}
            </div>
            
            <div id="field-musicFile" className="pt-8 sm:pt-12 border-t border-zinc-100 dark:border-zinc-800">
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full p-8 sm:p-16 border-4 border-dashed rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center gap-4 sm:gap-6 transition-all ${formData.musicFileName ? "bg-green-50 border-green-500 text-green-600" : errors.musicFile ? "bg-red-50 border-red-400 text-red-500" : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-400"}`}>
                {formData.musicFileName ? (
                  <><FileAudio size={48} /><span className="font-black text-sm sm:text-2xl italic">{formData.musicFileName}</span></>
                ) : (
                  <><UploadCloud size={32} /><span className="font-black uppercase tracking-widest text-[10px] sm:text-xl text-center">Upload MP3 Backing Track</span></>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setAudioFile(e.target.files[0]); updateForm({ musicFileName: e.target.files[0].name }); scrollToNext('field-vocalRange'); } }} accept="*/*" />
              </button>
              {errors.musicFile && <p className="text-red-500 text-[10px] uppercase font-bold mt-4 text-center flex justify-center items-center gap-1"><AlertCircle size={12}/>{errors.musicFile}</p>}

              <div className="mt-6 flex items-center gap-4 w-full">
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">OR</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              </div>

              <div className="mt-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                  Paste a Link Instead
                </label>
                <input 
                  type="url" 
                  placeholder="Paste a Google Drive or YouTube link..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-medium focus:border-blue-500 outline-none"
                  onChange={(e) => {
                    updateForm({ musicFileName: e.target.value });
                    setAudioFile(null); 
                  }}
                />
              </div>
            </div>
        </div>
      )}

      {/* LIVE VOCAL RANGE FINDER SECTION */}
      <div id="field-vocalRange" className="pt-8 sm:pt-12 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-bottom-4 scroll-mt-24">
        <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3">
           <Mic2 className="text-blue-500" /> Vocal Range
        </h3>
        
        {/* NEW: Manual Text Input */}
        <div className="mb-8">
          <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Write in your Voice Part or Range</label>
          <input 
            type="text" 
            required
            placeholder="e.g. Alto, Tenor, or C3-G5" 
            value={formData.vocalRange || ''} 
            onChange={e => updateForm({ vocalRange: e.target.value })} 
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-zinc-950 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Or use our interactive tool</span>
          </div>
        </div>

        <div className="mt-8 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-4 sm:p-5 rounded-2xl flex gap-3 sm:gap-4 items-start">
                <div className="mt-0.5 shrink-0 bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                    <Info size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      Find your comfortable range.
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400/80 mt-1 leading-relaxed">
                      Please do not strain or try to &quot;max out&quot; your voice! This is just a generalized self-assessment. <strong className="text-blue-800 dark:text-blue-200">This will NOT affect your audition chances.</strong>
                    </p>
                </div>
            </div>
            
            <VocalRangeTester 
                onStartTest={handleStartTest}
                onRangeFound={(voiceType, low, high) => {
                    updateForm({ 
                      vocalRange: `${low}-${high} (${voiceType})`,
                      voiceType: voiceType
                    });
                }} 
            />
        </div>
      </div>

    </div>
  );
}