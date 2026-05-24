// app/components/audition-wizard/Step1ActorInfo.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Image as ImageIcon, AlertCircle } from "lucide-react";
import { AuditionFormData, GRADES } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
}

export function Step1ActorInfo({ formData, updateForm, errors }: Props) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      updateForm({ headshotUrl: canvasRef.current.toDataURL("image/jpeg") });
      stopCamera();
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col md:flex-row gap-8 sm:gap-12">
        <div className="w-full md:w-64 space-y-4">
            <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-950 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-dashed border-zinc-300 dark:border-zinc-800 overflow-hidden relative shadow-inner group">
              {isCameraOpen ? (
                  <><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" /><canvas ref={canvasRef} className="hidden" /></>
              ) : formData.headshotUrl ? (
                <img src={formData.headshotUrl} alt="Headshot" className="w-full h-full object-cover" />
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4"><ImageIcon size={48} className="opacity-20" /><p className="text-[9px] font-black uppercase tracking-widest">Headshot Required</p></div>
              )}
            </div>

            <div className="flex gap-2">
              {isCameraOpen ? (
                <>
                  <button type="button" onClick={capturePhoto} className="flex-1 bg-blue-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"><Camera size={14} /> Capture</button>
                  <button type="button" onClick={stopCamera} className="px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest border border-zinc-200">Cancel</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setIsCameraOpen(true); setTimeout(() => { navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }).then(s => { if(videoRef.current) videoRef.current.srcObject = s; }); }, 100); }} className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                    <Camera size={14} /> {formData.headshotUrl ? "Retake" : "Camera"}
                  </button>
                  {/* 🟢 FIX: Upload button is now permanently visible */}
                  <button type="button" onClick={() => headshotInputRef.current?.click()} className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest border border-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    Upload {formData.headshotUrl ? "New" : ""}
                  </button>
                </>
              )}
              <input type="file" ref={headshotInputRef} className="hidden" accept="image/*" onChange={(e) => {
                if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = (f) => updateForm({ headshotUrl: f.target?.result as string }); reader.readAsDataURL(e.target.files[0]); }
              }} />
            </div>
        </div>
        
        <div className="flex-1 space-y-6 sm:space-y-10">
            <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">The Actor</h2>
            
            {/* CYT REGISTRATION GATEKEEPER */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 sm:p-5 rounded-2xl mb-6">
              <h3 className="text-amber-800 dark:text-amber-400 font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-2">
                <AlertCircle size={16} /> Stop! CYT Registration Required
              </h3>
              <p className="text-amber-700/90 dark:text-amber-500/90 text-xs sm:text-sm font-medium mb-4">
                For this trial production, you <strong>must</strong> be officially registered for the show on the main CYT website before filling out this digital audition paperwork.
              </p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  required 
                  checked={(formData as any).cytWebsiteRegistered || false}
                  onChange={e => updateForm({ cytWebsiteRegistered: e.target.checked } as any)}
                  className="mt-0.5 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-sm font-bold text-amber-900 dark:text-amber-200 group-hover:text-amber-700 transition-colors">
                  I confirm that I have already registered this student for the show on the main CYT website.
                </span>
              </label>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div id="field-fullName">
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.fullName} 
                  onChange={e => updateForm({fullName: e.target.value})} 
                  className={`w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border font-bold outline-none text-lg transition-colors focus:ring-2 ${errors.fullName ? "border-red-500 bg-red-50 focus:ring-red-200" : "border-zinc-200 dark:border-zinc-800 focus:ring-blue-200"}`} 
                />
                {errors.fullName && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div id="field-dob">
                    <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">DOB</label>
                    <input 
                      type="date" 
                      required
                      value={formData.dob} 
                      onChange={e => updateForm({ dob: e.target.value })} 
                      className={`w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border font-bold outline-none text-lg transition-colors focus:ring-2 ${errors.dob ? "border-red-500 bg-red-50 focus:ring-red-200" : "border-zinc-200 dark:border-zinc-800 focus:ring-blue-200"}`} 
                    />
                    {errors.dob && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.dob}</p>}
                  </div>
                  <div id="field-grade">
                    <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Grade</label>
                    <div className={`grid grid-cols-4 gap-1.5 p-1 rounded-xl transition-colors ${errors.grade ? "bg-red-50 border border-red-200" : ""}`}>
                      {GRADES.map(g => (
                        <button key={g} type="button" onClick={() => updateForm({ grade: g })} className={`py-2 rounded-lg font-black text-[9px] transition-all ${formData.grade === g ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>{g}</button>
                      ))}
                    </div>
                    {errors.grade && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.grade}</p>}
                  </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
