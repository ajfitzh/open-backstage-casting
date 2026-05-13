// app/[tenant]/audition-form/AuditionWizardClient.tsx
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Send, Search, Clock, Plus, User, Trash2, Edit, Lock } from "lucide-react";
import { submitRealAudition, cancelAudition } from "@/app/actions/auditions";
import { getExistingAuditions } from "@/app/lib/baserow"; 
import { setAccountPassword } from "@/app/actions/auth";
import { AuditionFormData, AuditionSlot, INITIAL_DATA, PRESET_SONGS } from "@/app/components/audition-wizard/types";
import { Step1ActorInfo } from "@/app/components/audition-wizard/Step1ActorInfo";
import { Step2CastingDetails } from "@/app/components/audition-wizard/Step2CastingDetails";
import { Step3Performance } from "@/app/components/audition-wizard/Step3Performance";
import { Step4AuditionTime } from "@/app/components/audition-wizard/Step4AuditionTime";
import { Step5Conflicts } from "@/app/components/audition-wizard/Step5Conflicts";
import { Step6Committees } from "@/app/components/audition-wizard/Step6Committees";
import { Step7Commitment } from "@/app/components/audition-wizard/Step7Commitment";
import EditAuditionForm from "@/app/components/casting/EditAuditionForm";

interface ExistingAudition { id: number; name: string; time: string; song: string; rawAuditionData?: any; }

interface Props {
  tenant: string;
  productionId: number;
  productionTitle: string;
  slots: AuditionSlot[];
  initialEmail?: string; 
  isGuest?: boolean;
  initialExistingAuditions?: ExistingAudition[];
}

export default function AuditionWizardClient({ tenant, productionId, productionTitle, slots, initialEmail, isGuest, initialExistingAuditions }: Props) {
  const STORAGE_KEY = `cyt_audition_draft_${productionId}`;

  const [view, setView] = useState<"login" | "hub" | "wizard">(initialEmail ? "hub" : "login");
  const [existingAuditions, setExistingAuditions] = useState<ExistingAudition[]>(initialExistingAuditions || []);

  const [currentStep, setCurrentStep] = useState(1); 
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [formData, setFormData] = useState<AuditionFormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [lookupData, setLookupData] = useState({ email: initialEmail || "", dob: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCanceling, setIsCanceling] = useState<number | null>(null);
  
  const [editingAudition, setEditingAudition] = useState<ExistingAudition | null>(null);
  const [showCommitteeGuide, setShowCommitteeGuide] = useState(false);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const totalSteps = 7;

  // ACCOUNT CLAIMING STATE
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSetSuccess, setPasswordSetSuccess] = useState(false);

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  useEffect(() => {
    if (view === "wizard") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) try { setFormData(JSON.parse(saved)); } catch (e) {}
    }
  }, [view, STORAGE_KEY]);

  useEffect(() => {
    if (view === "wizard" && currentStep > maxStepReached) setMaxStepReached(currentStep);
    if (view === "wizard" && currentStep > 0 && !isSuccess) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...formData, headshotUrl: null })); } 
      catch (e) { console.warn("Could not save to localStorage."); }
    }
  }, [formData, currentStep, isSuccess, maxStepReached, view, STORAGE_KEY]);

  const updateForm = (fields: Partial<AuditionFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    const newErrors = { ...errors };
    Object.keys(fields).forEach(key => delete newErrors[key]);
    setErrors(newErrors);
  };

  const handleSetPassword = async (formDataEvent: FormData) => {
    const password = formDataEvent.get("password") as string;
    if (!password) return;
    
    setIsSettingPassword(true);
    const result = await setAccountPassword(tenant, lookupData.email, password);
    
    if (result.success) {
      setPasswordSetSuccess(true);
    } else {
      alert(result.error || "Failed to set password. Please try again.");
    }
    setIsSettingPassword(false);
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.fullName) newErrors.fullName = "Please enter your full name.";
      if (!formData.dob) newErrors.dob = "Date of birth is required.";
      if (!formData.grade) newErrors.grade = "Please select a grade.";
    }
    if (currentStep === 2) {
      if (!formData.heightFt || !formData.heightIn) newErrors.height = "Please select your height.";
      if (!formData.hairColor) newErrors.hairColor = "Please select your hair color.";
    }
    if (currentStep === 3) {
      if (!formData.songTitle) newErrors.songTitle = "Please select or enter a song title.";
      if (!formData.usePresetSong && !formData.musicFileName) newErrors.musicFile = "Please upload an MP3 track or choose a preset.";
    }
    if (currentStep === 4) {
      if (!formData.auditionSlotId) newErrors.auditionSlotId = "Please select an audition time slot.";
    }
    if (currentStep === 5) {
      if (!formData.callbackStatus) newErrors.callbackStatus = "Please select your callback availability.";
    }
    if (currentStep === 6) {
      if (!formData.preShow1) newErrors.preShow1 = "Please select a 1st Choice Pre-Show Committee.";
      if (!formData.show1) newErrors.show1 = "Please select a 1st Choice Show Week Committee.";
      if (!formData.chairInterest) newErrors.chairInterest = "Please indicate if you are interested in chairing.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorId = Object.keys(newErrors)[0];
      document.getElementById(`field-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setErrors({});
    setCurrentStep((p) => Math.min(p + 1, totalSteps));
  };

  const handleUnlockProfile = async () => {
    setIsProcessing(true);
    const found = await getExistingAuditions(tenant, lookupData.email, productionId);
    setExistingAuditions(found);
    setView("hub");
    setIsProcessing(false);
  };

  const startNewAudition = () => {
    setFormData(INITIAL_DATA);
    setCurrentStep(1); setMaxStepReached(1); setIsSuccess(false); setView("wizard");
  };

  const returnToHub = async () => {
    setIsProcessing(true);
    const found = await getExistingAuditions(tenant, lookupData.email, productionId);
    setExistingAuditions(found);
    setIsSuccess(false); setView("hub"); setIsProcessing(false);
  };

  const handleCancelAudition = async (auditionId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to cancel the audition for ${name}? This cannot be undone.`)) return;
    setIsCanceling(auditionId);
    const res = await cancelAudition(tenant, auditionId);
    if (res.success) setExistingAuditions(prev => prev.filter(a => a.id !== auditionId));
    else alert("Failed to cancel. Please try again.");
    setIsCanceling(null);
  };

  const uploadToSpaces = async (file: File | Blob, filename: string, type: string) => {
    const res = await fetch('/api/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileType: type })
    });
    const data = await res.json();
    if (!data.uploadUrl) throw new Error("Failed to get upload URL");
    
    try {
      const uploadRes = await fetch(data.uploadUrl, { 
        method: 'PUT', 
        body: file, 
        headers: { 'Content-Type': type, 'x-amz-acl': 'public-read' } 
      });
      if (!uploadRes.ok) throw new Error(`Upload Failed: ${uploadRes.statusText}`);
    } catch (e) {
      console.error("Direct browser upload failed", e);
      throw e;
    }

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.studentSignature) newErrors.studentSignature = "Student must sign.";
    if (!formData.parentSignature) newErrors.parentSignature = "Parent must sign.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      document.getElementById('field-signatures')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsProcessing(true);
    try {
      let finalHeadshotUrl = formData.headshotUrl;
      let finalMusicUrl = null;

      if (formData.headshotUrl && formData.headshotUrl.startsWith('data:')) {
        const res = await fetch(formData.headshotUrl);
        const blob = await res.blob();
        finalHeadshotUrl = await uploadToSpaces(blob, `headshot-${Date.now()}.jpg`, blob.type || 'image/jpeg');
      }

      if (!formData.usePresetSong && audioFile) {
        finalMusicUrl = await uploadToSpaces(audioFile, audioFile.name, audioFile.type || 'audio/mpeg');
      }

      const selectedPreset = PRESET_SONGS.find(s => s.title === formData.songTitle);

      const payloadToSubmit = {
        ...formData,
        headshotUrl: finalHeadshotUrl,
        musicFileUrl: finalMusicUrl,
        studentSignature: "Agreed via Click",
        parentSignature: "Agreed via Click",
        practiceAudio: selectedPreset?.audioUrl || null,
        practiceLyrics: selectedPreset?.lyricsUrl || null,
      };

      const result = await submitRealAudition(tenant, productionId, payloadToSubmit, lookupData.email);

      if (result?.success) {
        setIsSuccess(true);
        localStorage.removeItem(STORAGE_KEY);
      } else {
        alert(result?.error || "Something went wrong saving your audition. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed. Please check your connection or bucket configuration.");
    } finally {
      setIsProcessing(false);
    }
  };

  const firstName = formData.fullName.split(" ")[0] || "Actor";
  const selectedSlot = slots.find(s => s.id === formData.auditionSlotId);

  // === SUCCESS VIEW ===
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 pb-20">
        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-2xl text-center max-w-lg w-full border border-zinc-200 dark:border-zinc-800">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl sm:text-4xl font-black dark:text-white mb-4 uppercase italic tracking-tighter">Wish Granted!</h2>
          
          <div className="space-y-4 mb-6">
            <p className="text-blue-600 dark:text-blue-400 font-black text-lg sm:text-2xl uppercase italic tracking-tight">
              {firstName} is set up for {selectedSlot?.time}!
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">
              A confirmation email has been sent to:<br/>
              <span className="font-bold text-zinc-900 dark:text-white">{lookupData.email}</span>
            </p>
          </div>

          {/* 🟢 FIXED PASSWORD WIDGET (Nested structure removed) */}
          {passwordSetSuccess ? (
            <div className="mt-8 mb-8 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-left">
               <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
               <div>
                 <h4 className="text-emerald-500 font-black uppercase tracking-widest text-sm">Account Secured</h4>
                 <p className="text-emerald-500/80 text-xs font-medium mt-1">Your password is set. You can now securely log in when the Cast List drops!</p>
               </div>
            </div>
          ) : (
            <div className="mt-8 mb-8 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left">
              <div className="flex items-start gap-4">
                <Lock className="text-amber-500 shrink-0 mt-1" size={24} />
                <div className="w-full">
                  <h4 className="text-amber-500 font-black uppercase tracking-widest text-sm mb-1">
                    Secure Your Family Hub
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs font-medium mb-4">
                    To view the cast list next Friday and accept roles, you need to secure this email address with a password.
                  </p>
                  <form action={handleSetPassword} className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="password" 
                      name="password"
                      placeholder="Create a password..." 
                      required
                      className="flex-1 bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                    />
                    <button 
                      type="submit"
                      disabled={isSettingPassword}
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-3 sm:py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
                    >
                      {isSettingPassword ? "Saving..." : "Lock Account"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3 mt-4">
            <button onClick={startNewAudition} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 sm:py-5 rounded-2xl uppercase tracking-widest shadow-xl text-xs sm:text-sm transition-all active:scale-95 text-center">
              + Add Another Student
            </button>
            <button onClick={returnToHub} disabled={isProcessing} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-4 sm:py-5 rounded-2xl uppercase tracking-widest shadow-xl text-xs sm:text-sm transition-transform active:scale-95 text-center">
              Back to My Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 px-2 sm:px-4 flex flex-col items-center justify-center font-sans overflow-x-hidden">
      <div className="max-w-3xl w-full space-y-4">
        <div className="flex items-center justify-between px-2 shrink-0">
          <button onClick={() => setView(initialEmail ? "hub" : "login")} className="text-[10px] sm:text-sm font-bold text-zinc-500 hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft size={16} /> Exit
          </button>
          <span className="inline-block bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter italic">CYT+ {productionTitle}</span>
        </div>

        {/* --- LOGIN VIEW --- */}
        {view === "login" && (
          <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-xl mx-auto border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center mb-6 sm:mb-8">
              <Search size={40} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic">Welcome</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">Verify your email to find your family profile.</p>
            </div>
            <form className="space-y-4 sm:space-y-6" onSubmit={(e) => { e.preventDefault(); handleUnlockProfile(); }}>
              <input type="email" required placeholder="Parent Email" value={lookupData.email} onChange={e => setLookupData({...lookupData, email: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 font-bold outline-none shadow-inner" />
              <button type="submit" disabled={isProcessing} className="w-full py-4 sm:py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl text-sm disabled:opacity-50">
                {isProcessing ? "Searching..." : "Unlock Profile"}
              </button>
            </form>
          </div>
        )}

        {/* --- HUB VIEW --- */}
        {view === "hub" && (
          <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center mb-8">
              <User size={40} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Your Hub</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">Signed in as <span className="font-bold text-zinc-900 dark:text-white">{lookupData.email}</span></p>
            </div>
            
            <div className="space-y-4 mb-8">
              {existingAuditions.length > 0 ? (
                existingAuditions.map(audition => (
                  <div key={audition.id} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-black text-lg dark:text-white tracking-tighter">{audition.name}</h4>
                        <p className="text-xs text-zinc-500 font-bold flex items-center gap-2 mt-1"><Clock size={12} className="text-blue-500" /> {audition.time}</p>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => setEditingAudition(audition)} 
                          className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => handleCancelAudition(audition.id, audition.name)} 
                          disabled={isCanceling === audition.id} 
                          className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-zinc-500 font-bold text-sm">No students registered for this show yet.</p>
                </div>
              )}
            </div>

            <button onClick={startNewAudition} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl text-sm flex items-center justify-center gap-2">
              <Plus size={18} /> Register a Student
            </button>
          </div>
        )}

        {/* --- WIZARD VIEW --- */}
        {view === "wizard" && (
          <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col sm:max-h-[85vh]">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
               <div className="flex gap-1 sm:gap-1.5">
                 {[1,2,3,4,5,6,7].map(i => (
                   <button 
                    key={i} type="button" disabled={i > maxStepReached} onClick={() => setCurrentStep(i)}
                    className={`h-1.5 sm:h-2 w-4 sm:w-10 rounded-full transition-all duration-300 ${i === currentStep ? "bg-blue-600 scale-y-125" : i < currentStep ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:border-zinc-800"} ${i <= maxStepReached ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`} 
                   />
                 ))}
               </div>
               <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Step {currentStep}/7</span>
            </div>

            <div ref={scrollContainerRef} className="p-5 sm:p-10 overflow-y-auto custom-scrollbar flex-1">
              <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12 pb-4">
                
                {currentStep === 1 && <Step1ActorInfo formData={formData} updateForm={updateForm} errors={errors} />}
                {currentStep === 2 && <Step2CastingDetails formData={formData} updateForm={updateForm} errors={errors} />}
                {currentStep === 3 && <Step3Performance formData={formData} updateForm={updateForm} errors={errors} setAudioFile={setAudioFile} />}
                {currentStep === 4 && <Step4AuditionTime formData={formData} updateForm={updateForm} errors={errors} slots={slots} />}
                {currentStep === 5 && <Step5Conflicts formData={formData} updateForm={updateForm} errors={errors} />}
                {currentStep === 6 && <Step6Committees formData={formData} updateForm={updateForm} errors={errors} setShowCommitteeGuide={setShowCommitteeGuide} />}
                {currentStep === 7 && <Step7Commitment formData={formData} updateForm={updateForm} errors={errors} />}
              
              </form>
            </div>

            <div className="mt-auto p-4 sm:p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <button type="button" onClick={() => currentStep === 1 ? setView("hub") : setCurrentStep(p => p - 1)} className="px-4 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-sm text-zinc-400 hover:text-blue-600 transition-all flex items-center gap-2">
                  <ChevronLeft size={18} /> {currentStep === 1 ? "Cancel" : "Back"}
                </button>
                {currentStep < 7 ? (
                  <button type="button" onClick={handleNext} className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-6 sm:px-14 py-3 sm:py-5 rounded-xl sm:rounded-[2rem] font-black uppercase text-[10px] sm:text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="submit" onClick={handleSubmit} disabled={isProcessing} className="bg-blue-600 text-white px-6 sm:px-14 py-3 sm:py-5 rounded-xl sm:rounded-[2rem] font-black uppercase text-[10px] sm:text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                    {isProcessing ? "Processing..." : "Submit"} <Send size={18} />
                  </button>
                )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL OVERLAY FOR EDITING EXISTING AUDITIONS */}
      {editingAudition && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-20">
          <div className="w-full max-w-3xl relative mb-20 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditingAudition(null)}
              className="absolute -top-12 right-0 text-white hover:text-zinc-300 font-bold tracking-widest uppercase text-xs transition-colors"
            >
              Close
            </button>
            <EditAuditionForm 
              tenant={tenant} 
              auditionId={editingAudition.id} 
              initialData={editingAudition.rawAuditionData || { fullName: editingAudition.name }} 
              onSuccess={() => {
                setEditingAudition(null);
                returnToHub(); 
              }} 
            />
          </div>
        </div>
      )}

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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media (min-width: 640px) { .custom-scrollbar::-webkit-scrollbar { width: 8px; } }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 4px; }
      `}</style>
    </div>
  );
}