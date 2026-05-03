"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Mic, 
  Send, UploadCloud, Music, FileAudio, Download, 
  Search, Ruler, Youtube, Camera, Image as ImageIcon,
  Clock, MessageSquare, Printer, Plus, User, Trash2
} from "lucide-react";
import { submitRealAudition, cancelAudition } from "@/app/actions/auditions";
// 🟢 FIXED IMPORT: Moved to lib/baserow to prevent 500 error!
import { getExistingAuditions } from "@/app/lib/baserow"; 
import { upgradeGuestToUser } from "@/app/actions/auth";

// --- Types ---
type ConflictLevel = "available" | "absent" | "late" | "tentative";
type ConflictEntry = { level: ConflictLevel; notes: string; };

type AuditionFormData = {
  fullName: string; dob: string; sex: string; grade: string;
  hairColor: string; heightFt: string; heightIn: string; headshotUrl: string | null;
  preferredRoles: string; acceptAnyRole: boolean;
  songTitle: string; musicFileName: string; usePresetSong: boolean; 
  auditionSlotId: string | null;
  conflicts: Record<string, ConflictEntry>;
  offBookAgreement: boolean; 
  parentCommitteeAgreement: boolean;
  studentSignature: string; 
  parentSignature: string;
};

interface AuditionSlot {
  id: string;
  day: string;
  time: string;
  capacity: number;
  taken: number;
  isFull?: boolean;
}

interface ExistingAudition {
  id: number;
  name: string;
  time: string;
  song: string;
}

interface Props {
  tenant: string;
  productionId: number;
  productionTitle: string;
  slots: AuditionSlot[];
  initialEmail?: string; 
  isGuest?: boolean;
  initialExistingAuditions?: ExistingAudition[];
}

// --- Constants ---
const GRADES = ["7th", "8th", "9th", "10th", "11th", "12th", "College", "Grad"];
const HAIR_COLORS = ["Blonde", "Brown", "Black", "Red", "Auburn", "Grey", "Other"];
const INCHES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

const REHEARSAL_DATES = [
  { id: "june_11", label: "June 11 (Music)", time: "10am - 1pm", type: "encouraged" },
  { id: "june_20", label: "June 20 (Music)", time: "10am - 3pm", type: "encouraged" },
  { id: "june_23", label: "June 23 (Music)", time: "4:30pm - 8pm", type: "encouraged" },
  { id: "july_06", label: "July 6 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_07", label: "July 7 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_08", label: "July 8 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_09", label: "July 9 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_10", label: "July 10 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_11", label: "July 11 (Sets)", time: "All Day", type: "critical" },
  { id: "july_13", label: "July 13 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_14", label: "July 14 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_15", label: "July 15 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_16", label: "July 16 (Week 2)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_23", label: "July 23 (Tech)", time: "4pm - 9pm", type: "mandatory" },
];

const PRESET_SONGS = [
  { 
    id: "reflection", 
    title: "Reflection (Mulan)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/mulan-reflection-piano.mp3" 
  },
  { 
    id: "consider_yourself", 
    title: "Consider Yourself (Oliver!)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/oliver-consideryourself-piano.mp3" 
  },
  { 
    id: "tomorrow", 
    title: "Tomorrow (Annie)", 
    audioUrl: "https://cyt-fredericksburg.nyc3.digitaloceanspaces.com/tracks/annie-tomorrow-piano.mp3" 
  },
];

const INITIAL_DATA: AuditionFormData = {
  fullName: "", dob: "", sex: "", grade: "",
  hairColor: "", heightFt: "5", heightIn: "0", headshotUrl: null,
  preferredRoles: "", acceptAnyRole: false,
  songTitle: "", musicFileName: "", usePresetSong: false,
  auditionSlotId: null,
  conflicts: {}, 
  offBookAgreement: false, parentCommitteeAgreement: false,
  studentSignature: "", parentSignature: ""
};

export default function AuditionWizardClient({ tenant, productionId, productionTitle, slots, initialEmail, isGuest, initialExistingAuditions }: Props) {
  const STORAGE_KEY = `cyt_audition_draft_${productionId}`;

  const [view, setView] = useState<"login" | "hub" | "wizard">(initialEmail ? "hub" : "login");
  const [existingAuditions, setExistingAuditions] = useState<ExistingAudition[]>(initialExistingAuditions || []);

  const [currentStep, setCurrentStep] = useState(1); 
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [formData, setFormData] = useState<AuditionFormData>(INITIAL_DATA);
  const [lookupData, setLookupData] = useState({ email: initialEmail || "", dob: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [password, setPassword] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 6;

  const calculateAge = useCallback((dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  useEffect(() => {
    if (view === "wizard") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) try { setFormData(JSON.parse(saved)); } catch (e) {}
    }
  }, [view]);

  useEffect(() => {
    if (view === "wizard" && currentStep > maxStepReached) setMaxStepReached(currentStep);
    if (view === "wizard" && currentStep > 0 && !isSuccess) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, currentStep, isSuccess, maxStepReached, view]);

  const updateForm = (fields: Partial<AuditionFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleNext = () => setCurrentStep((p) => Math.min(p + 1, totalSteps));
  const handlePrev = () => setCurrentStep((p) => Math.max(p - 1, 0));

  const handleUnlockProfile = async () => {
    setIsProcessing(true);
    const found = await getExistingAuditions(tenant, lookupData.email, productionId);
    setExistingAuditions(found);
    setView("hub");
    setIsProcessing(false);
  };

  const startNewAudition = () => {
    setFormData(INITIAL_DATA);
    setCurrentStep(1);
    setMaxStepReached(1);
    setIsSuccess(false);
    setView("wizard");
  };

  const returnToHub = async () => {
    setIsProcessing(true);
    const found = await getExistingAuditions(tenant, lookupData.email, productionId);
    setExistingAuditions(found);
    setIsSuccess(false);
    setView("hub");
    setIsProcessing(false);
  };
const [isCanceling, setIsCanceling] = useState<number | null>(null);

  const handleCancelAudition = async (auditionId: number, name: string) => {
    // Safety check so parents don't accidentally click it
    if (!window.confirm(`Are you sure you want to cancel the audition for ${name}? This cannot be undone.`)) return;

    setIsCanceling(auditionId);
    const res = await cancelAudition(tenant, auditionId);
    if (res.success) {
       // Remove the deleted student from the Hub view instantly
       setExistingAuditions(prev => prev.filter(a => a.id !== auditionId));
    } else {
       alert("Failed to cancel. Please try again.");
    }
    setIsCanceling(null);
  };
  const markAllAvailable = () => {
    const allAvailable: Record<string, ConflictEntry> = {};
    REHEARSAL_DATES.forEach(date => {
      allAvailable[date.id] = { level: "available", notes: "" };
    });
    updateForm({ conflicts: allAvailable });
  };

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

  const dataURLtoBlob = (dataurl: string) => {
    let arr = dataurl.split(','), match = arr[0].match(/:(.*?);/), mime = match ? match[1] : 'image/jpeg',
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
  }

  const uploadToSpaces = async (file: File | Blob, filename: string, type: string) => {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, fileType: type })
    });
    const data = await res.json();
    if (!data.uploadUrl) throw new Error("Failed to get upload URL");
    
    await fetch(data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': type }
    });
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      let finalHeadshotUrl = formData.headshotUrl;
      let finalMusicUrl = null;

      if (formData.headshotUrl && formData.headshotUrl.startsWith('data:')) {
        const blob = dataURLtoBlob(formData.headshotUrl);
        finalHeadshotUrl = await uploadToSpaces(blob, `headshot-${Date.now()}.jpg`, 'image/jpeg');
      }

      if (!formData.usePresetSong && audioFile) {
        finalMusicUrl = await uploadToSpaces(audioFile, audioFile.name, audioFile.type);
      }

      const payloadToSubmit = {
        ...formData,
        headshotUrl: finalHeadshotUrl,
        musicFileUrl: finalMusicUrl
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
      alert("Upload failed. Please check your connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPreset = PRESET_SONGS.find(s => s.title === formData.songTitle);
  const calculatedAge = calculateAge(formData.dob);
  const selectedSlot = slots.find(s => s.id === formData.auditionSlotId);
  const firstName = formData.fullName.split(" ")[0] || "Actor";

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 pb-20">
        <div className="bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-2xl text-center max-w-lg w-full border border-zinc-200 dark:border-zinc-800 print:shadow-none print:border-none">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6 print:hidden" />
          <h2 className="text-2xl sm:text-4xl font-black dark:text-white mb-4 uppercase italic tracking-tighter">Wish Granted!</h2>
          <div className="space-y-4 mb-10">
            <p className="text-blue-600 dark:text-blue-400 font-black text-lg sm:text-2xl uppercase italic tracking-tight">
              {firstName} is set up for {selectedSlot?.time}!
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">
              A confirmation email has been sent to:<br/>
              <span className="font-bold text-zinc-900 dark:text-white">{lookupData.email || "your email"}</span>
            </p>
          </div>

          {isGuest && !upgradeSuccess && (
            <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 mb-8 print:hidden animate-in fade-in slide-in-from-bottom-4">
               <div className="flex items-center gap-3 mb-4 justify-center">
                  <Sparkles size={18} className="text-blue-600" />
                  <h3 className="font-black text-zinc-900 dark:text-white uppercase italic tracking-widest text-sm">Skip This Next Time</h3>
               </div>
               <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-medium">Set a password to save your family's profile for future shows and classes.</p>
               <div className="flex gap-2">
                 <input 
                   type="password" 
                   placeholder="Create a password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-sm font-bold outline-none"
                 />
                 <button 
                   onClick={async () => {
                     setIsUpgrading(true);
                     const res = await upgradeGuestToUser(tenant, lookupData.email, password);
                     if (res.success) setUpgradeSuccess(true);
                     setIsUpgrading(false);
                   }}
                   disabled={password.length < 6 || isUpgrading}
                   className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all"
                 >
                   {isUpgrading ? "Saving..." : "Save"}
                 </button>
               </div>
            </div>
          )}

          {isGuest && upgradeSuccess && (
             <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-200 dark:border-green-800/30 mb-8 print:hidden flex items-center justify-center gap-3 animate-in zoom-in-95">
                <CheckCircle2 size={20} className="text-green-600" />
                <p className="font-black text-green-800 dark:text-green-400 text-sm uppercase italic tracking-widest">Profile Saved!</p>
             </div>
          )}

          <div className="space-y-3 print:hidden">
            <button 
              onClick={startNewAudition}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 sm:py-5 rounded-2xl uppercase tracking-widest shadow-xl text-xs sm:text-sm transition-all active:scale-95 text-center"
            >
              + Add Another Student
            </button>
            <button 
              onClick={returnToHub}
              disabled={isProcessing}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-4 sm:py-5 rounded-2xl uppercase tracking-widest shadow-xl text-xs sm:text-sm transition-transform active:scale-95 text-center disabled:opacity-50"
            >
              {isProcessing ? "Loading..." : "Back to My Hub"}
            </button>
            <button 
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 text-zinc-400 font-bold hover:text-blue-600 text-[10px] uppercase tracking-widest transition-colors py-2"
            >
              <Printer size={14} /> Print Audition Form
            </button>
          </div>
        </div>
        
        <div className="hidden print:block fixed inset-0 bg-white p-10 text-zinc-900">
           <h1 className="text-3xl font-black uppercase italic border-b-4 border-black pb-4 mb-6">Audition Record: {formData.fullName}</h1>
           <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="space-y-2">
                 <p><strong>Actor:</strong> {formData.fullName}</p>
                 <p><strong>Grade:</strong> {formData.grade}</p>
                 <p><strong>Slot:</strong> {selectedSlot?.day}, {selectedSlot?.time}</p>
                 <p><strong>Song:</strong> {formData.songTitle}</p>
              </div>
              <div className="space-y-2">
                 <p><strong>Parent:</strong> {formData.parentSignature}</p>
                 <p><strong>Email:</strong> {lookupData.email}</p>
                 <p><strong>Height:</strong> {formData.heightFt}'{formData.heightIn}"</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 px-2 sm:px-4 flex flex-col items-center justify-center font-sans overflow-x-hidden">
      <div className="max-w-3xl w-full space-y-4">
        <div className="flex items-center justify-between px-2 shrink-0">
          <Link href={`/`} className="text-[10px] sm:text-sm font-bold text-zinc-500 hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft size={16} /> Exit
          </Link>
          <span className="inline-block bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter italic">CYT+ {productionTitle}</span>
        </div>

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
            <button onClick={() => setView("wizard")} className="w-full mt-6 text-zinc-400 font-bold hover:text-blue-600 text-[10px] uppercase tracking-widest underline decoration-2 underline-offset-4">New Student? Start Blank</button>
          </div>
        )}

        {view === "hub" && (
          <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center mb-8">
              <User size={40} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Your Hub</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">Signed in as <span className="font-bold text-zinc-900 dark:text-white">{lookupData.email}</span></p>
            </div>
            
            <div className="space-y-4 mb-8">
              {existingAuditions.length > 0 ? (
                <>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Registrations</h3>
                  {existingAuditions.map(audition => (
                    <div key={audition.id} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4">
                       <div>
                         <h4 className="font-black text-lg dark:text-white tracking-tighter">{audition.name}</h4>
                         <p className="text-xs text-zinc-500 font-bold flex items-center gap-2 mt-1">
                           <Clock size={12} className="text-blue-500" /> {audition.time}
                         </p>
                       </div>
<div className="flex items-center gap-4 text-right">
     <div className="hidden sm:block">
       <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block">Song</span>
       <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300 italic">{audition.song}</span>
     </div>
     
     {/* 🟢 THE CANCEL BUTTON */}
     <button 
       onClick={() => handleCancelAudition(audition.id, audition.name)}
       disabled={isCanceling === audition.id}
       className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all disabled:opacity-50"
       title="Cancel Audition"
     >
       <Trash2 size={16} />
     </button>
   </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-zinc-500 font-bold text-sm">No students registered for this show yet.</p>
                </div>
              )}
            </div>

            <button onClick={startNewAudition} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl text-sm flex items-center justify-center gap-2 transition-transform active:scale-95">
              <Plus size={18} /> Register a Student
            </button>
          </div>
        )}

        {view === "wizard" && (
          <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col sm:max-h-[85vh]">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
               <div className="flex gap-1 sm:gap-1.5">
                 {[1,2,3,4,5,6].map(i => (
                   <button 
                    key={i} 
                    type="button"
                    disabled={i > maxStepReached}
                    onClick={() => setCurrentStep(i)}
                    className={`h-1.5 sm:h-2 w-6 sm:w-12 rounded-full transition-all duration-300 ${i === currentStep ? "bg-blue-600 scale-y-125" : i < currentStep ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:border-zinc-800"} ${i <= maxStepReached ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`} 
                   />
                 ))}
               </div>
               <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Step {currentStep}/6</span>
            </div>

            <div className="p-5 sm:p-10 overflow-y-auto custom-scrollbar flex-1">
              <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12 pb-4">
                {currentStep === 1 && (
                  <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <div className="flex flex-col md:flex-row gap-8 sm:gap-12">
                      <div className="w-full md:w-64 space-y-4">
                         <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-950 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-dashed border-zinc-300 dark:border-zinc-800 overflow-hidden relative shadow-inner group">
                            {isCameraOpen ? (
                               <>
                                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                 <canvas ref={canvasRef} className="hidden" />
                               </>
                            ) : formData.headshotUrl ? (
                              <img src={formData.headshotUrl} alt="Headshot" className="w-full h-full object-cover" />
                            ) : (
                               <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                                  <ImageIcon size={48} className="opacity-20" />
                                  <p className="text-[9px] font-black uppercase tracking-widest">Headshot Required</p>
                               </div>
                            )}
                         </div>

                         {/* 🟢 FIXED CAMERA UI */}
                         <div className="flex gap-2">
                           {isCameraOpen ? (
                             <>
                               {/* CAPTURE BUTTON */}
                               <button 
                                 type="button" 
                                 onClick={capturePhoto} 
                                 className="flex-1 bg-blue-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                               >
                                  <Camera size={14} /> Capture
                               </button>
                               {/* CANCEL BUTTON */}
                               <button 
                                 type="button" 
                                 onClick={stopCamera} 
                                 className="px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest border border-zinc-200"
                               >
                                  Cancel
                               </button>
                             </>
                           ) : (
                             <>
                               {/* OPEN CAMERA / RETAKE BUTTON */}
                               <button 
                                 type="button" 
                                 onClick={() => { 
                                   setIsCameraOpen(true); 
                                   setTimeout(() => {
                                     navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
                                       .then(s => { if(videoRef.current) videoRef.current.srcObject = s; });
                                   }, 100); 
                                 }} 
                                 className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-blue-600 hover:text-white transition-colors"
                               >
                                  <Camera size={14} /> {formData.headshotUrl ? "Retake Photo" : "Camera"}
                               </button>
                               {/* UPLOAD BUTTON (Hides after photo taken) */}
                               {!formData.headshotUrl && (
                                 <button 
                                   type="button" 
                                   onClick={() => headshotInputRef.current?.click()} 
                                   className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest border border-zinc-200"
                                 >
                                   Upload
                                 </button>
                               )}
                             </>
                           )}
                           <input type="file" ref={headshotInputRef} className="hidden" accept="image/*" onChange={(e) => {
                              if(e.target.files?.[0]) {
                                 const reader = new FileReader();
                                 reader.onload = (f) => updateForm({ headshotUrl: f.target?.result as string });
                                 reader.readAsDataURL(e.target.files[0]);
                              }
                           }} />
                         </div>
                      </div>
                      
                      {/* ... Rest of Step 1 ... */}
                      <div className="flex-1 space-y-6 sm:space-y-10">
                         <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">The Actor</h2>
                         <div className="space-y-4 sm:space-y-6">
                            <div>
                              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Full Name</label>
                              <input type="text" required value={formData.fullName} onChange={e => updateForm({fullName: e.target.value})} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-lg shadow-inner" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                               <div>
                                  <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">DOB</label>
                                  <input type="date" required value={formData.dob} onChange={e => updateForm({ dob: e.target.value })} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-lg" />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Grade</label>
                                 <div className="grid grid-cols-4 gap-1.5">
                                   {GRADES.map(g => (
                                     <button key={g} type="button" onClick={() => updateForm({ grade: g })} className={`py-2 rounded-lg font-black text-[9px] transition-all ${formData.grade === g ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>{g}</button>
                                   ))}
                                 </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Steps 2-6 Remain Unchanged */}
                {currentStep === 2 && (
                  <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Casting Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 space-y-6">
                        <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2"><Ruler size={16} /> Height</label>
                        <div className="flex gap-2 sm:gap-4">
                          {["4","5","6"].map(ft => (
                            <button key={ft} type="button" onClick={() => updateForm({ heightFt: ft })} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-lg transition-all ${formData.heightFt === ft ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-400"}`}>{ft}'</button>
                          ))}
                        </div>
                        <div className="grid grid-cols-6 gap-1 sm:gap-2">
                          {INCHES.map(inch => (
                            <button key={inch} type="button" onClick={() => updateForm({ heightIn: inch })} className={`py-2 rounded-lg font-black text-[10px] transition-all ${formData.heightIn === inch ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-100 dark:border-zinc-800"}`}>{inch}"</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6">
                         <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Hair Color</label>
                         <div className="grid grid-cols-2 gap-2">
                           {HAIR_COLORS.map(c => (
                             <button key={c} type="button" onClick={() => updateForm({ hairColor: c })} className={`py-3 sm:py-4 rounded-xl font-black text-[9px] uppercase border transition-all ${formData.hairColor === c ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md" : "bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-400"}`}>{c}</button>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">The Performance</h2>
                    <div className={`p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 transition-all cursor-pointer flex gap-4 sm:gap-8 items-start ${formData.usePresetSong ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20" : "bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"}`} onClick={() => updateForm({ usePresetSong: !formData.usePresetSong, songTitle: "" })}>
                      <input type="checkbox" checked={formData.usePresetSong} readOnly className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 rounded-lg mt-1" />
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-white text-lg sm:text-2xl uppercase tracking-tighter italic">Trouble Deciding?</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-sm sm:text-lg">Choose an "easy-start" song from the show. We'll have the music ready!</p>
                      </div>
                    </div>

                    {formData.usePresetSong ? (
                      <div className="space-y-6 animate-in slide-in-from-top-4">
                        {PRESET_SONGS.length > 6 ? (
                          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-sm">
                            <select
                              value={formData.songTitle}
                              onChange={(e) => updateForm({ songTitle: e.target.value })}
                              className="w-full bg-transparent p-4 text-lg font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
                            >
                              <option value="" disabled>Select an easy-start track...</option>
                              {PRESET_SONGS.map(s => (
                                <option key={s.id} value={s.title}>{s.title}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            {PRESET_SONGS.map(s => (
                              <button key={s.id} type="button" onClick={() => updateForm({ songTitle: s.title })} className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all ${formData.songTitle === s.title ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 hover:border-blue-400"}`}>
                                <Music size={24} className={`mb-4 ${formData.songTitle === s.title ? "text-white" : "text-blue-600"} opacity-50`} />
                                <p className="font-black text-sm sm:text-xl uppercase italic leading-tight">{s.title}</p>
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedPreset && (
                          <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-500 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] flex flex-col md:flex-row items-center gap-6 sm:gap-10 animate-in zoom-in-95">
                             <CheckCircle2 size={32} className="text-green-500 hidden md:block" />
                             <div className="flex-1 text-center md:text-left">
                                <h3 className="font-black text-green-900 dark:text-green-400 uppercase text-lg sm:text-2xl italic">Music Secured</h3>
                                <p className="text-green-700/80 dark:text-green-500/80 text-sm sm:text-lg">The track will be waiting at the sound booth. Practice below!</p>
                             </div>
                             
                             <div className="shrink-0 flex flex-col items-center gap-3 w-full md:w-auto">
                                <audio 
                                  controls 
                                  className="h-10 w-full sm:w-[250px]" 
                                  src={selectedPreset.audioUrl}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                                
                                <a 
                                  href={selectedPreset.audioUrl} 
                                  download 
                                  target="_blank" 
                                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 hover:bg-green-700 transition-colors w-full shadow-md active:scale-95"
                                >
                                  <Download size={16} /> Download MP3
                                </a>
                             </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Song Title</label>
                         <input type="text" value={formData.songTitle} onChange={(e) => updateForm({ songTitle: e.target.value })} className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 text-zinc-900 dark:text-white font-black text-xl sm:text-3xl italic outline-none shadow-inner" placeholder="E.g. On My Own" />
                         
                         <div className="pt-8 sm:pt-12 border-t border-zinc-100 dark:border-zinc-800">
                           <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full p-8 sm:p-16 border-4 border-dashed rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center gap-4 sm:gap-6 transition-all ${formData.musicFileName ? "bg-green-50 border-green-500 text-green-600" : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-400"}`}>
                             {formData.musicFileName ? (
                                <><FileAudio size={48} /><span className="font-black text-sm sm:text-2xl italic">{formData.musicFileName}</span></>
                             ) : (
                                <><UploadCloud size={32} /><span className="font-black uppercase tracking-widest text-[10px] sm:text-xl text-center">Upload MP3 Backing Track</span></>
                             )}
                             <input 
                               type="file" 
                               ref={fileInputRef} 
                               className="hidden" 
                               onChange={(e) => {
                                 if (e.target.files?.[0]) {
                                   setAudioFile(e.target.files[0]);
                                   updateForm({ musicFileName: e.target.files[0].name });
                                 }
                               }} 
                               accept="audio/*" 
                             />
                           </button>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Audition Time</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {slots.map(slot => {
                        const remaining = slot.capacity - slot.taken;
                        const isFull = slot.isFull || remaining <= 0;
                        const isSelected = formData.auditionSlotId === slot.id;
                        return (
                          <button 
                            key={slot.id} 
                            type="button" 
                            disabled={isFull}
                            onClick={() => updateForm({ auditionSlotId: slot.id })} 
                            className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 text-left relative transition-all group ${
                              isSelected 
                                ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" 
                                : isFull 
                                  ? "bg-zinc-100 dark:bg-zinc-800 opacity-50 cursor-not-allowed border-zinc-200"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 hover:border-blue-400"
                            }`}
                          >
                            <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-[7px] font-black uppercase italic ${
                              isSelected ? "bg-white text-blue-600" : isFull ? "bg-red-600 text-white" : "bg-blue-100 text-blue-600"
                            }`}>
                              {isFull ? "Full" : `${remaining} Left`}
                            </div>
                            <Clock className="mb-4 opacity-30" size={24} />
                            <p className="font-black text-2xl tracking-tighter italic leading-none mb-1">{slot.time}</p>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-50">{slot.day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-8 sm:space-y-10 animate-in slide-in-from-right-8 duration-500">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Availability</h2>
                        <button type="button" onClick={markAllAvailable} className="bg-blue-600 text-white px-5 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Mark All Free</button>
                     </div>
                     <div className="space-y-3 sm:space-y-4">
                       {REHEARSAL_DATES.map(d => {
                         const curr = formData.conflicts[d.id] || { level: "available", notes: "" };
                         const showNotes = curr.level === "late" || curr.level === "tentative";
                         return (
                          <div key={d.id} className={`p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border transition-all ${curr.level === "available" ? "bg-green-50/50 border-green-200" : "bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"}`}>
                              <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                                <div className="flex-1">
                                    <p className={`font-black text-base sm:text-xl tracking-tighter ${curr.level === "available" ? "text-green-900" : "dark:text-white"}`}>{d.label}</p>
                                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest italic">{d.time}</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                                   {[
                                     { id: "available", label: "Free", color: "bg-green-600" },
                                     { id: "late", label: "Late", color: "bg-amber-500" },
                                     { id: "tentative", label: "Tent", color: "bg-orange-400" },
                                     { id: "absent", label: "Absent", color: "bg-red-600" }
                                   ].map(l => (
                                     <button key={l.id} type="button" onClick={() => updateForm({ conflicts: {...formData.conflicts, [d.id]: {level: l.id as ConflictLevel, notes: curr.notes} } })} className={`px-2 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[9px] font-black uppercase rounded-lg sm:rounded-xl transition-all ${curr.level === l.id ? `${l.color} text-white shadow-md` : "bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-100"}`}>
                                       {l.label}
                                     </button>
                                   ))}
                                </div>
                              </div>
                              {showNotes && (
                                <div className="mt-3 animate-in slide-in-from-top-2">
                                   <div className="relative">
                                      <MessageSquare size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                      <input type="text" placeholder="Explain..." value={curr.notes} onChange={e => updateForm({ conflicts: {...formData.conflicts, [d.id]: {level: curr.level, notes: e.target.value} } })} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pl-10 text-[10px] sm:text-xs font-bold outline-none" />
                                   </div>
                                </div>
                              )}
                          </div>
                         );
                       })}
                     </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Commitment</h2>
                    <div className="space-y-4 sm:space-y-6">
                      <label className="flex items-start p-6 sm:p-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 rounded-[1.5rem] sm:rounded-[3rem] cursor-pointer">
                          <input type="checkbox" required checked={formData.offBookAgreement} onChange={e => updateForm({ offBookAgreement: e.target.checked })} className="h-6 w-6 sm:h-10 sm:w-10 text-blue-600 rounded-lg mt-1 shrink-0" />
                          <div className="ml-4 sm:ml-8 space-y-2 sm:space-y-4">
                             <h4 className="text-lg sm:text-2xl font-black dark:text-white italic uppercase tracking-tighter">OFF-BOOK</h4>
                             <p className="text-blue-900/80 dark:text-blue-400/80 text-xs sm:text-lg font-medium leading-relaxed">I commit to being **OFF BOOK** (lines and music memorized) by July 6.</p>
                          </div>
                      </label>
                      <label className="flex items-start p-6 sm:p-10 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 rounded-[1.5rem] sm:rounded-[3rem] cursor-pointer">
                          <input type="checkbox" required checked={formData.parentCommitteeAgreement} onChange={e => updateForm({ parentCommitteeAgreement: e.target.checked })} className="h-6 w-6 sm:h-10 sm:w-10 text-zinc-600 rounded-lg mt-1 shrink-0" />
                          <div className="ml-4 sm:ml-8 space-y-2 sm:space-y-4">
                             <h4 className="text-lg sm:text-2xl font-black dark:text-white italic uppercase tracking-tighter">Parent Help</h4>
                             <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-lg font-medium leading-relaxed">I understand parents are expected to help sell **10 tickets** for the show.</p>
                          </div>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 pt-6 sm:pt-10 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-2">
                         <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Student Signature</label>
                         <input type="text" required value={formData.studentSignature} onChange={e => updateForm({studentSignature: e.target.value})} placeholder="Full Name" className="w-full p-6 sm:p-8 rounded-xl sm:rounded-[2rem] bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 font-black text-xl sm:text-3xl italic outline-none" />
                      </div>
                      <div className="space-y-2">
                         <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Parent Signature</label>
                         <input type="text" required value={formData.parentSignature} onChange={e => updateForm({parentSignature: e.target.value})} placeholder="Full Name" className="w-full p-6 sm:p-8 rounded-xl sm:rounded-[2rem] bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 font-black text-xl sm:text-3xl italic outline-none" />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="mt-auto p-4 sm:p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <button type="button" onClick={() => currentStep === 1 ? setView("hub") : handlePrev()} className="px-4 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-sm text-zinc-400 hover:text-blue-600 transition-all flex items-center gap-2">
                  <ChevronLeft size={18} /> {currentStep === 1 ? "Cancel" : "Back"}
                </button>
                {currentStep < 6 ? (
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
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media (min-width: 640px) { .custom-scrollbar::-webkit-scrollbar { width: 8px; } }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 4px; }
        @media print {
          body * { visibility: hidden; }
          .print\:block, .print\:block * { visibility: visible; }
          .print\:block { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}