/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, User, Sparkles, Mic, 
  CalendarCheck, Send, CalendarX, UploadCloud, Music, FileAudio, 
  Search, Ruler, AlertTriangle, Youtube, Camera, X, Image as ImageIcon,
  Clock, Users, MapPin, Info, Ticket, MessageSquare, Printer
} from "lucide-react";
import { submitRealAudition } from "@/app/actions/auditions";

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

const AUDITION_SLOTS = [
  { id: "t_500", day: "Thursday", time: "5:00 PM", capacity: 10, taken: 10 },
  { id: "t_530", day: "Thursday", time: "5:30 PM", capacity: 10, taken: 5 },
  { id: "t_630", day: "Thursday", time: "6:30 PM", capacity: 10, taken: 7 },
  { id: "t_700", day: "Thursday", time: "7:00 PM", capacity: 10, taken: 8 },
  { id: "f_500", day: "Friday", time: "5:00 PM", capacity: 10, taken: 7 },
  { id: "f_530", day: "Friday", time: "5:30 PM", capacity: 10, taken: 8 },
  { id: "f_630", day: "Friday", time: "6:30 PM", capacity: 10, taken: 7 },
  { id: "f_700", day: "Friday", time: "7:00 PM", capacity: 10, taken: 8 },
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

interface Props {
  tenant: string;
  productionId: number;
  productionTitle: string;
}

export default function AuditionWizardClient({ tenant, productionId, productionTitle }: Props) {
  const STORAGE_KEY = `cyt_audition_draft_${productionId}`;

  const [currentStep, setCurrentStep] = useState(0); 
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [formData, setFormData] = useState<AuditionFormData>(INITIAL_DATA);
  const [lookupData, setLookupData] = useState({ email: "", dob: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Track the actual File object for S3 upload
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setFormData(JSON.parse(saved)); } catch (e) {}
  }, []);

  useEffect(() => {
    if (currentStep > maxStepReached) setMaxStepReached(currentStep);
    if (currentStep > 0 && !isSuccess) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, currentStep, isSuccess, maxStepReached]);

  const updateForm = (fields: Partial<AuditionFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleNext = () => setCurrentStep((p) => Math.min(p + 1, totalSteps));
  const handlePrev = () => setCurrentStep((p) => Math.max(p - 1, 0));

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

  // --- S3 Upload Helpers ---
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

  // --- Final Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      let finalHeadshotUrl = formData.headshotUrl;
      let finalMusicUrl = null;

      // 1. Upload Captured/Uploaded Headshot to S3
      if (formData.headshotUrl && formData.headshotUrl.startsWith('data:')) {
        const blob = dataURLtoBlob(formData.headshotUrl);
        finalHeadshotUrl = await uploadToSpaces(blob, `headshot-${Date.now()}.jpg`, 'image/jpeg');
      }

      // 2. Upload MP3 track if provided
      if (!formData.usePresetSong && audioFile) {
        finalMusicUrl = await uploadToSpaces(audioFile, audioFile.name, audioFile.type);
      }

      // 3. Prepare final data payload
      const payloadToSubmit = {
        ...formData,
        headshotUrl: finalHeadshotUrl,
        musicFileUrl: finalMusicUrl
      };

      // 4. Send to Baserow via Server Action
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
  const selectedSlot = AUDITION_SLOTS.find(s => s.id === formData.auditionSlotId);
  const firstName = formData.fullName.split(" ")[0] || "Actor";

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
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
          <div className="space-y-3 print:hidden">
            <Link 
              href={`/${tenant}`} 
              className="block w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-4 sm:py-5 rounded-2xl uppercase tracking-widest shadow-xl text-xs sm:text-sm"
            >
              Back to Dashboard
            </Link>
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
          <Link href={`/${tenant}`} className="text-[10px] sm:text-sm font-bold text-zinc-500 hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft size={16} /> Exit
          </Link>
          <span className="inline-block bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter italic">CYT+ {productionTitle}</span>
        </div>

        {currentStep === 0 && (
          <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-xl mx-auto border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center mb-6 sm:mb-8">
              <Search size={40} className="text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic">Welcome</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">Verify your email to pre-fill your profile.</p>
            </div>
            <form className="space-y-4 sm:space-y-6">
              <input type="email" placeholder="Parent Email" value={lookupData.email} onChange={e => setLookupData({...lookupData, email: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 font-bold outline-none shadow-inner" />
              <input type="date" value={lookupData.dob} onChange={e => setLookupData({...lookupData, dob: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 font-bold outline-none shadow-inner" />
              <button type="button" onClick={() => setCurrentStep(1)} className="w-full py-4 sm:py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl text-sm">Unlock Profile</button>
            </form>
            <button onClick={() => setCurrentStep(1)} className="w-full mt-6 text-zinc-400 font-bold hover:text-blue-600 text-[10px] uppercase tracking-widest underline decoration-2 underline-offset-4">New Student? Start Blank</button>
          </div>
        )}

        {currentStep > 0 && (
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
                            {formData.headshotUrl ? (
                              <img src={formData.headshotUrl} alt="Headshot" className="w-full h-full object-cover" />
                            ) : isCameraOpen ? (
                               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            ) : (
                               <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                                  <ImageIcon size={48} className="opacity-20" />
                                  <p className="text-[9px] font-black uppercase tracking-widest">Headshot Required</p>
                               </div>
                            )}
                         </div>
                         <div className="flex gap-2">
                            <button type="button" onClick={isCameraOpen ? capturePhoto : () => { 
                              setIsCameraOpen(true); 
                              setTimeout(() => {
                                navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
                                  .then(s => { if(videoRef.current) videoRef.current.srcObject = s; });
                              }, 100); 
                            }} className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                               <Camera size={14} /> {isCameraOpen ? "Capture" : "Camera"}
                            </button>
                            <button type="button" onClick={() => headshotInputRef.current?.click()} className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest border border-zinc-200">Upload</button>
                            <input type="file" ref={headshotInputRef} className="hidden" accept="image/*" onChange={(e) => {
                               if(e.target.files?.[0]) {
                                  const reader = new FileReader();
                                  reader.onload = (f) => updateForm({ headshotUrl: f.target?.result as string });
                                  reader.readAsDataURL(e.target.files[0]);
                               }
                            }} />
                         </div>
                      </div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 animate-in slide-in-from-top-4">
                        {PRESET_SONGS.map(s => (
                          <button key={s.id} type="button" onClick={() => updateForm({ songTitle: s.title })} className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all ${formData.songTitle === s.title ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 hover:border-blue-400"}`}>
                            <Music size={24} className={`mb-4 ${formData.songTitle === s.title ? "text-white" : "text-blue-600"} opacity-50`} />
                            <p className="font-black text-sm sm:text-xl uppercase italic leading-tight">{s.title}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Song Title</label>
                         <input type="text" value={formData.songTitle} onChange={(e) => updateForm({ songTitle: e.target.value })} className="w-full rounded-xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 text-zinc-900 dark:text-white font-black text-xl sm:text-3xl italic outline-none shadow-inner" placeholder="E.g. On My Own" />
                      </div>
                    )}

                    <div className="pt-8 sm:pt-12 border-t border-zinc-100 dark:border-zinc-800">
                      {formData.usePresetSong && selectedPreset ? (
                        <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-500 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] flex flex-col md:flex-row items-center gap-6 sm:gap-10">
                           <CheckCircle2 size={32} className="text-green-500" />
                           <div className="flex-1 text-center md:text-left">
                              <h3 className="font-black text-green-900 dark:text-green-400 uppercase text-lg sm:text-2xl italic">Music Secured</h3>
                              <p className="text-green-700/80 dark:text-green-500/80 text-sm sm:text-lg">The track will be waiting at the sound booth.</p>
                           </div>
                           <a href={selectedPreset.youtube} target="_blank" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 sm:px-8 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs flex items-center gap-3">
                              <Youtube size={20} className="text-red-600" /> Practice
                           </a>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
                    <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Audition Time</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {AUDITION_SLOTS.map(slot => {
                        const remaining = slot.capacity - slot.taken;
                        const isFull = remaining === 0;
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
                <button type="button" onClick={handlePrev} className="px-4 sm:px-10 py-3 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-sm text-zinc-400 hover:text-blue-600 transition-all flex items-center gap-2">
                  <ChevronLeft size={18} /> Back
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