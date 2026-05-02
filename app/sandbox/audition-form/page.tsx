"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, User, Sparkles, Mic, 
  CalendarCheck, Send, CalendarX, UploadCloud, Music, FileAudio, 
  Search, Ruler, AlertTriangle, Youtube, Camera, X, Image as ImageIcon,
  Clock, Users, MapPin, Info, Ticket
} from "lucide-react";

// --- Types ---
type ConflictLevel = "available" | "absent";
type ConflictEntry = { level: ConflictLevel; notes: string; };

type AuditionFormData = {
  fullName: string; 
  dob: string; 
  sex: string; 
  grade: string;
  hairColor: string; 
  heightFt: string; 
  heightIn: string; 
  headshotUrl: string | null;
  preferredRoles: string; 
  acceptAnyRole: boolean;
  songTitle: string; 
  musicFileName: string; 
  usePresetSong: boolean; // Renamed from isFirstTime
  auditionSlotId: string | null;
  conflicts: Record<string, ConflictEntry>;
  offBookAgreement: boolean; 
  parentCommitteeAgreement: boolean;
  studentSignature: string; 
  parentSignature: string;
};

// --- Constants ---
const STORAGE_KEY = "cyt_plus_itw_final_v4_production";
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

const AUDITION_SLOTS = [
  { id: "t_500", day: "Thursday", time: "5:00 PM" },
  { id: "t_530", day: "Thursday", time: "5:30 PM" },
  { id: "t_630", day: "Thursday", time: "6:30 PM" },
  { id: "t_700", day: "Thursday", time: "7:00 PM" },
  { id: "f_500", day: "Friday", time: "5:00 PM" },
  { id: "f_530", day: "Friday", time: "5:30 PM" },
  { id: "f_630", day: "Friday", time: "6:30 PM" },
  { id: "f_700", day: "Friday", time: "7:00 PM" },
];

const PRESET_SONGS = [
  { id: "giants", title: "Giants in the Sky", youtube: "https://www.youtube.com/results?search_query=giants+in+the+sky+karaoke" },
  { id: "steps", title: "On the Steps of the Palace", youtube: "https://www.youtube.com/results?search_query=on+the+steps+of+the+palace+karaoke" },
  { id: "agony", title: "Agony", youtube: "https://www.youtube.com/results?search_query=agony+into+the+woods+karaoke" },
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

export default function AuditionWizard() {
  const [currentStep, setCurrentStep] = useState(0); 
  const [formData, setFormData] = useState<AuditionFormData>(INITIAL_DATA);
  const [lookupData, setLookupData] = useState({ email: "", dob: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Cleanup camera if user navigates away or closes it
  useEffect(() => {
    if (!isCameraOpen || currentStep !== 1) {
      stopCamera();
    }
  }, [isCameraOpen, currentStep, stopCamera]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setFormData(JSON.parse(saved)); } catch (e) {}
  }, []);

  useEffect(() => {
    if (currentStep > 0 && !isSuccess) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, currentStep, isSuccess]);

  const updateForm = (fields: Partial<AuditionFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleNext = () => setCurrentStep((p) => Math.min(p + 1, totalSteps));
  const handlePrev = () => setCurrentStep((p) => Math.max(p - 1, 0));

  const handleSecureLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      if (lookupData.email.includes("@")) {
        setFormData(prev => ({ ...prev, fullName: "Oliver Fitzhugh", dob: "2012-05-15", grade: "9th" }));
        setCurrentStep(1);
      } else {
        setLookupError("Record not found.");
      }
      setIsProcessing(false);
    }, 8000);
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

  const markAllAvailable = () => {
    const allAvailable = REHEARSAL_DATES.reduce((acc, date) => {
      acc[date.id] = { level: "available", notes: "" };
      return acc;
    }, {} as Record<string, ConflictEntry>);
    updateForm({ conflicts: allAvailable });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      localStorage.removeItem(STORAGE_KEY);
    }, 2000);
  };

  const selectedPreset = PRESET_SONGS.find(s => s.title === formData.songTitle);
  const calculatedAge = calculateAge(formData.dob);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3rem] shadow-2xl text-center max-w-lg w-full border border-zinc-200 dark:border-zinc-800">
          <CheckCircle2 size={80} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-4xl font-black dark:text-white mb-4 uppercase italic tracking-tighter">Wish Granted!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-10 text-lg">Your audition spot is secured. Break a leg!</p>
          <Link href="/sandbox" className="block w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl">Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 py-4 px-4 overflow-hidden flex flex-col items-center justify-center font-sans">
      <div className="max-w-4xl w-full space-y-4">
        
        {/* Nav Header */}
        <div className="flex items-center justify-between px-2">
          <Link href="/sandbox" className="text-sm font-bold text-zinc-500 hover:text-blue-600 flex items-center gap-1 transition-all">
            <ChevronLeft size={16} /> Exit
          </Link>
          <span className="inline-block bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter italic">CYT+ Into the Woods</span>
        </div>

        {/* STEP 0: LOOKUP */}
        {currentStep === 0 && (
          <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[2.5rem] p-8 max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center mb-8">
              <Search size={48} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-4xl font-black dark:text-white uppercase italic">Welcome Back</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Verify your email and we'll pre-fill your profile.</p>
            </div>
            <form onSubmit={handleSecureLookup} className="space-y-6">
              {lookupError && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-sm border border-red-100">{lookupError}</div>}
              <input type="email" required placeholder="Parent Email" value={lookupData.email} onChange={e => setLookupData({...lookupData, email: e.target.value})} className="w-full rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
              <input type="date" required value={lookupData.dob} onChange={e => setLookupData({...lookupData, dob: e.target.value})} className="w-full rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">{isProcessing ? "Searching..." : "Unlock Profile"}</button>
            </form>
            <button onClick={() => setCurrentStep(1)} className="w-full mt-8 text-zinc-400 font-bold hover:text-blue-600 text-sm uppercase tracking-widest underline decoration-2 underline-offset-4">New Student? Start Blank Form</button>
          </div>
        )}

        {currentStep > 0 && (
          <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-[3rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* PROGRESS BAR */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
               <div className="flex gap-1.5">
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${i <= currentStep ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />
                 ))}
               </div>
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Step {currentStep} / 6</span>
            </div>

            <div className="p-8 sm:p-12 overflow-y-auto custom-scrollbar flex-1">
              <form onSubmit={handleSubmit} className="space-y-12 pb-8">
                
                {/* STEP 1: ACTOR */}
                {currentStep === 1 && (
                  <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <div className="flex flex-col md:flex-row gap-12">
                      <div className="w-full md:w-72 space-y-4">
                         <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-950 rounded-[2.5rem] border-2 border-dashed border-zinc-300 dark:border-zinc-800 overflow-hidden relative shadow-inner group">
                            {formData.headshotUrl ? (
                              <>
                                <img src={formData.headshotUrl} alt="Headshot" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => updateForm({ headshotUrl: null })} className="absolute top-4 right-4 bg-zinc-900/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                              </>
                            ) : isCameraOpen ? (
                               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            ) : (
                               <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                                  <ImageIcon size={64} className="opacity-20" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Headshot Required</p>
                               </div>
                            )}
                         </div>
                         <div className="flex gap-2">
                            <button type="button" onClick={isCameraOpen ? capturePhoto : () => { 
                              setIsCameraOpen(true); 
                              setTimeout(() => {
                                navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
                                  .then(s => { if(videoRef.current) videoRef.current.srcObject = s; })
                                  .catch(() => setIsCameraOpen(false));
                              }, 100); 
                            }} className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                               <Camera size={14} /> {isCameraOpen ? "Capture" : "Camera"}
                            </button>
                            <button type="button" onClick={() => headshotInputRef.current?.click()} className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">Upload</button>
                            <input type="file" ref={headshotInputRef} className="hidden" accept="image/*" onChange={(e) => {
                               if(e.target.files?.[0]) {
                                  const reader = new FileReader();
                                  reader.onload = (f) => updateForm({ headshotUrl: f.target?.result as string });
                                  reader.readAsDataURL(e.target.files[0]);
                               }
                            }} />
                         </div>
                      </div>

                      <div className="flex-1 space-y-10">
                         <h2 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter">The Actor</h2>
                         <div className="space-y-6">
                            <div>
                              <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-3">Full Name</label>
                              <input type="text" required value={formData.fullName} onChange={e => updateForm({fullName: e.target.value})} className="w-full p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-xl shadow-inner" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                               <div>
                                  <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-3">Date of Birth</label>
                                  <div className="relative">
                                    <input type="date" required value={formData.dob} onChange={e => updateForm({ dob: e.target.value })} className="w-full p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-xl shadow-inner" />
                                    {calculatedAge !== null && (
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase italic shadow-lg">
                                        Age: {calculatedAge}
                                      </div>
                                    )}
                                  </div>
                               </div>
                               <div>
                                <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-3">Current Grade</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {GRADES.map(g => (
                                    <button key={g} type="button" onClick={() => updateForm({ grade: g })} className={`py-3 rounded-xl font-black text-[10px] transition-all ${formData.grade === g ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>{g}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: LOOKS */}
                {currentStep === 2 && (
                  <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter">Casting Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 space-y-6">
                        <div>
                          <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2"><Ruler size={16} /> Height (Feet)</label>
                          <div className="flex justify-between gap-4">
                            {["4","5","6"].map(ft => (
                              <button key={ft} type="button" onClick={() => updateForm({ heightFt: ft })} className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all ${formData.heightFt === ft ? "bg-blue-600 text-white shadow-md scale-105" : "bg-white dark:bg-zinc-900 text-zinc-400"}`}>{ft}'</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2"><Ruler size={16} /> Height (Inches)</label>
                          <div className="grid grid-cols-6 gap-2">
                            {INCHES.map(inch => (
                              <button key={inch} type="button" onClick={() => updateForm({ heightIn: inch })} className={`py-2 rounded-xl font-black text-xs transition-all ${formData.heightIn === inch ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-100 dark:border-zinc-800"}`}>{inch}"</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                         <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Hair Color</label>
                         <div className="grid grid-cols-2 gap-2">
                           {HAIR_COLORS.map(c => (
                             <button key={c} type="button" onClick={() => updateForm({ hairColor: c })} className={`py-4 rounded-xl font-black text-[10px] uppercase border transition-all ${formData.hairColor === c ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl" : "bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-400 hover:border-blue-500"}`}>{c}</button>
                           ))}
                         </div>
                      </div>
                    </div>
                    <div className="space-y-6 pt-6">
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest">Preferred Roles</label>
                      <input type="text" value={formData.preferredRoles} onChange={(e) => updateForm({ preferredRoles: e.target.value })} className="w-full rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6 text-zinc-900 dark:text-white font-bold outline-none text-xl shadow-inner" placeholder="Cinderella, Baker, Witch..." />
                      <label className="flex items-center p-10 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] cursor-pointer hover:border-blue-400 transition-all shadow-inner">
                        <input type="checkbox" checked={formData.acceptAnyRole} onChange={(e) => updateForm({ acceptAnyRole: e.target.checked })} className="h-10 w-10 text-blue-600 rounded-xl" />
                        <span className="ml-6 font-black text-zinc-900 dark:text-white uppercase tracking-widest text-lg">I will gladly accept any role</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 3: THE SONG */}
                {currentStep === 3 && (
                  <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter leading-tight">The Performance</h2>
                    <div className={`p-10 rounded-[2.5rem] border-2 transition-all cursor-pointer flex gap-8 items-start ${formData.usePresetSong ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20" : "bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"}`} onClick={() => updateForm({ usePresetSong: !formData.usePresetSong, songTitle: "" })}>
                      <input type="checkbox" checked={formData.usePresetSong} readOnly className="h-8 w-8 text-blue-600 rounded-xl mt-1" />
                      <div>
                        <h4 className="font-black text-zinc-900 dark:text-white text-2xl uppercase tracking-tighter italic">Trouble Deciding?</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2 text-lg leading-relaxed">Choose an "easy-start" song from the show. We'll have the music ready—no file upload needed!</p>
                      </div>
                    </div>

                    {formData.usePresetSong ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
                        {PRESET_SONGS.map(s => (
                          <button key={s.id} type="button" onClick={() => updateForm({ songTitle: s.title })} className={`p-8 rounded-[2rem] border-2 text-left transition-all ${formData.songTitle === s.title ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-400"}`}>
                            <Music size={32} className={`mb-6 ${formData.songTitle === s.title ? "text-white" : "text-blue-600"} opacity-50`} />
                            <p className="font-black text-xl uppercase italic leading-tight">{s.title}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest">Audition Song Title</label>
                         <input type="text" value={formData.songTitle} onChange={(e) => updateForm({ songTitle: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-8 text-zinc-900 dark:text-white font-black text-3xl italic outline-none shadow-inner" placeholder="E.g. On My Own" />
                      </div>
                    )}

                    <div className="pt-12 border-t border-zinc-100 dark:border-zinc-800">
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-8">Audition Music Hub</label>
                      {formData.usePresetSong && selectedPreset ? (
                        <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-500 p-10 rounded-[3rem] flex flex-col md:flex-row items-center gap-10 animate-in zoom-in-95">
                           <CheckCircle2 size={40} className="text-green-500" />
                           <div className="flex-1 text-center md:text-left">
                              <h3 className="font-black text-green-900 dark:text-green-400 uppercase text-2xl italic tracking-tighter">Music Secured</h3>
                              <p className="text-green-700/80 dark:text-green-500/80 text-lg font-medium leading-relaxed">The track for <strong>{formData.songTitle}</strong> will be waiting at the sound booth.</p>
                           </div>
                           <a href={selectedPreset.youtube} target="_blank" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 shadow-xl transition-all">
                              <Youtube size={24} className="text-red-600" /> Practice
                           </a>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full p-16 border-4 border-dashed rounded-[3rem] flex flex-col items-center gap-6 transition-all ${formData.musicFileName ? "bg-green-50 border-green-500 text-green-600" : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-400"}`}>
                           {formData.musicFileName ? (
                              <><FileAudio size={64} /><span className="font-black text-2xl italic">{formData.musicFileName}</span></>
                           ) : (
                              <><UploadCloud size={48} /><span className="font-black uppercase tracking-widest text-xl">Upload Backing Track (MP3)</span></>
                           )}
                           <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && updateForm({ musicFileName: e.target.files[0].name })} accept="audio/*" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: SLOT */}
                {currentStep === 4 && (
                  <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <div>
                      <h2 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter leading-tight">Choose Your Time</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xl font-medium mt-1">Kingdom Baptist Church (June 2nd-3rd).</p>
                    </div>

                    {["Thursday", "Friday"].map(day => (
                      <div key={day} className="space-y-6">
                         <h3 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">{day} Auditions</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                           {AUDITION_SLOTS.filter(s => s.day === day).map(slot => {
                              const isSelected = formData.auditionSlotId === slot.id;
                              return (
                                <button key={slot.id} type="button" onClick={() => updateForm({ auditionSlotId: slot.id })} className={`p-8 rounded-[2.5rem] border-2 text-left relative transition-all group ${isSelected ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-105 z-10" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-400"}`}>
                                   <Clock className={`mb-6 ${isSelected ? "text-blue-200" : "text-zinc-300"}`} size={32} />
                                   <p className="font-black text-3xl tracking-tighter italic leading-none mb-1">{slot.time}</p>
                                   <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Select</span>
                                </button>
                              );
                           })}
                         </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* STEP 5: AVAILABILITY */}
                {currentStep === 5 && (
                  <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                          <h2 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter leading-tight">Availability</h2>
                          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Mark any dates where you are absent.</p>
                        </div>
                        <button type="button" onClick={markAllAvailable} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-600 hover:text-white transition-all">Mark All Available</button>
                     </div>
                     <div className="bg-zinc-50 dark:bg-zinc-950 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 shadow-inner overflow-hidden">
                       {REHEARSAL_DATES.map(d => {
                         const curr = formData.conflicts[d.id] || { level: "available", notes: "" };
                         return (
                          <div key={d.id} className="p-6 md:grid md:grid-cols-12 gap-8 items-center hover:bg-white dark:hover:bg-zinc-900/50 transition-colors">
                              <div className="col-span-5 space-y-1">
                                 <p className="font-black text-xl dark:text-white tracking-tighter flex items-center gap-3">
                                   {d.label}
                                   {d.type === "critical" && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase italic">Sets</span>}
                                 </p>
                                 <p className="text-xs font-black uppercase text-zinc-400 tracking-widest italic">{d.time}</p>
                              </div>
                              <div className="col-span-7 flex gap-1 bg-zinc-200/50 dark:bg-zinc-900 p-1.5 rounded-2xl">
                                 {["available", "absent"].map(l => (
                                   <button key={l} type="button" onClick={() => updateForm({ conflicts: {...formData.conflicts, [d.id]: {level: l as ConflictLevel, notes: ""} } })} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${curr.level === l ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xl scale-105" : "text-zinc-400 hover:text-zinc-600"}`}>
                                     {l === "available" ? "Free" : "Absent"}
                                   </button>
                                 ))}
                              </div>
                          </div>
                         );
                       })}
                     </div>
                  </div>
                )}

                {/* STEP 6: SIGNATURES */}
                {currentStep === 6 && (
                  <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter leading-tight">The Commitment</h2>
                    <div className="space-y-6">
                      <label className="flex items-start p-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 rounded-[3rem] cursor-pointer hover:border-blue-600 transition-all shadow-xl group">
                          <input type="checkbox" required checked={formData.offBookAgreement} onChange={e => updateForm({ offBookAgreement: e.target.checked })} className="h-10 w-10 text-blue-600 rounded-2xl mt-1 shadow-inner shrink-0" />
                          <div className="ml-8 space-y-4">
                             <h4 className="text-2xl font-black dark:text-white italic uppercase tracking-tighter">OFF-BOOK AGREEMENT</h4>
                             <p className="text-blue-900/80 dark:text-blue-400/80 text-lg font-medium leading-relaxed">I commit to being **OFF BOOK** (lines and music memorized) by July 6.</p>
                          </div>
                      </label>
                      
                      <label className="flex items-start p-10 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-[3rem] cursor-pointer hover:border-blue-400 transition-all shadow-lg relative overflow-hidden group">
                          <div className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase italic tracking-widest flex items-center gap-1 shadow-lg">
                             <Ticket size={12} /> Requirements
                          </div>
                          <input type="checkbox" required checked={formData.parentCommitteeAgreement} onChange={e => updateForm({ parentCommitteeAgreement: e.target.checked })} className="h-10 w-10 text-zinc-600 rounded-2xl mt-1 shadow-inner shrink-0" />
                          <div className="ml-8 space-y-4">
                             <h4 className="text-2xl font-black dark:text-white italic uppercase tracking-tighter">Volunteer Support</h4>
                             <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium leading-relaxed">I understand that parents are expected to serve on a committee and help sell **10 tickets** for the production.</p>
                          </div>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-10 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-4">
                         <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest">Student Signature</label>
                         <input type="text" required value={formData.studentSignature} onChange={e => updateForm({studentSignature: e.target.value})} placeholder="Full Name" className="w-full p-8 rounded-[2rem] bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 font-black text-3xl italic shadow-inner outline-none focus:border-blue-600 transition-colors" />
                      </div>
                      <div className="space-y-4">
                         <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest">Parent Signature</label>
                         <input type="text" required value={formData.parentSignature} onChange={e => updateForm({parentSignature: e.target.value})} placeholder="Full Name" className="w-full p-8 rounded-[2rem] bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 font-black text-3xl italic shadow-inner outline-none focus:border-blue-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* FIXED FOOTER NAVIGATION */}
            <div className="mt-auto p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <button type="button" onClick={handlePrev} className="px-10 py-5 rounded-[1.5rem] font-black uppercase text-zinc-400 hover:text-blue-600 transition-all flex items-center gap-3">
                  <ChevronLeft size={24} /> Back
                </button>
                {currentStep < 6 ? (
                  <button type="button" onClick={handleNext} className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-14 py-5 rounded-[2rem] font-black uppercase flex items-center gap-4 shadow-2xl transition-all active:scale-95 group">
                    Next <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                ) : (
                  <button type="submit" onClick={handleSubmit} disabled={isProcessing} className="bg-blue-600 text-white px-14 py-5 rounded-[2rem] font-black uppercase flex items-center gap-4 shadow-2xl shadow-blue-600/40 transition-all active:scale-95">
                    {isProcessing ? "Processing..." : "Submit Audition"} <Send size={24} />
                  </button>
                )}
            </div>

          </div>
        )}
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
      `}</style>
    </div>
  );
}