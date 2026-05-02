"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  ChevronLeft, ChevronRight, CheckCircle2, User, Sparkles, Mic, 
  CalendarCheck, Send, CalendarX, UploadCloud, Music, FileAudio, Search, Ruler, AlertTriangle, ExternalLink, Youtube
} from "lucide-react";

// --- Types ---
type ConflictLevel = "available" | "partial" | "tentative" | "absent";
type ConflictEntry = { level: ConflictLevel; notes: string; };

type AuditionFormData = {
  fullName: string; dob: string; age: string; sex: string; grade: string;
  hairColor: string; heightFt: string; heightIn: string; preferredRoles: string; acceptAnyRole: boolean;
  specialSkills: string; alterAppearance: "yes" | "no" | ""; romanticScenes: "yes" | "no" | "";
  fearOfHeights: "yes" | "no" | ""; isFirstTime: boolean; songTitle: string;
  musicFileName: string; conflicts: Record<string, ConflictEntry>;
  scheduleAgreement: boolean; offBookAgreement: boolean; studentSignature: string; parentSignature: string;
};

// --- Constants ---
const STORAGE_KEY = "cyt_plus_itw_draft";
const GRADES = ["7th", "8th", "9th", "10th", "11th", "12th", "College", "Grad"];
const AGES = ["13", "14", "15", "16", "17", "18", "19", "20"];
const HAIR_COLORS = ["Blonde", "Brown", "Black", "Red", "Auburn", "Grey", "Other"];

const REHEARSAL_DATES = [
  { id: "june_11", label: "June 11 (Music)", time: "10am - 1pm", type: "encouraged" },
  { id: "june_20", label: "June 20 (Music)", time: "10am - 3pm", type: "encouraged" },
  { id: "june_23", label: "June 23 (Music)", time: "4:30pm - 8pm", type: "encouraged" },
  { id: "july_06", label: "July 6 (Intensive)", time: "9am - 4pm", type: "mandatory" },
  { id: "july_11", label: "July 11 (Warehouse/Sets)", time: "All Day", type: "critical" },
];

// Added YouTube links for the "Practice Hub"
const PRESET_SONGS = [
  { id: "giants", title: "Giants in the Sky", youtube: "https://www.youtube.com/results?search_query=giants+in+the+sky+karaoke" },
  { id: "steps", title: "On the Steps of the Palace", youtube: "https://www.youtube.com/results?search_query=on+the+steps+of+the+palace+karaoke" },
  { id: "agony", title: "Agony", youtube: "https://www.youtube.com/results?search_query=agony+into+the+woods+karaoke" },
];

const INITIAL_DATA: AuditionFormData = {
  fullName: "", dob: "", age: "13", sex: "", grade: "",
  hairColor: "", heightFt: "5", heightIn: "0", preferredRoles: "", acceptAnyRole: false,
  specialSkills: "", alterAppearance: "", romanticScenes: "", fearOfHeights: "",
  isFirstTime: false, songTitle: "", musicFileName: "", conflicts: {}, 
  scheduleAgreement: false, offBookAgreement: false, studentSignature: "", parentSignature: "",
};

export default function AuditionWizard() {
  const [currentStep, setCurrentStep] = useState(0); 
  const [formData, setFormData] = useState<AuditionFormData>(INITIAL_DATA);
  const [lookupData, setLookupData] = useState({ email: "", dob: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 5;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setFormData(JSON.parse(saved));
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) updateForm({ musicFileName: e.target.files[0].name });
  };

  const handleSecureLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      if (lookupData.email.includes("@")) {
        setFormData(prev => ({ ...prev, fullName: "Oliver Fitzhugh", age: "13", grade: "8th" }));
        setCurrentStep(1);
      } else {
        setLookupError("Profile not found.");
      }
      setIsProcessing(false);
    }, 1000);
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

  // Helper to find practice URL
  const selectedPreset = PRESET_SONGS.find(s => s.title === formData.songTitle);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-500">
          <CheckCircle2 size={60} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-4xl font-black dark:text-white mb-4 italic uppercase tracking-tighter italic">Wish Granted!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-10 text-lg font-medium leading-relaxed">
            Your form for <strong>Into The Woods</strong> is in. <br/>See you on June 2!
          </p>
          <Link href="/sandbox" className="block w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 uppercase tracking-widest">Done</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/sandbox" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1">
            <ChevronLeft size={16} /> Cancel
          </Link>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">CYT+ Intensive</p>
            <p className="text-sm text-zinc-400 font-medium">Summer 2026</p>
          </div>
        </div>

        {/* STEP 0: LOOKUP */}
        {currentStep === 0 && (
          <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[2.5rem] p-10 max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
                <Search size={32} />
              </div>
              <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">Welcome Back</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">We'll pre-fill your data if you've been with us before.</p>
            </div>

            <form onSubmit={handleSecureLookup} className="space-y-6 bg-zinc-50 dark:bg-zinc-950 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              {lookupError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl text-xs text-red-600 text-center font-bold">{lookupError}</div>}
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-2">Parent Email</label>
                <input type="email" required value={lookupData.email} onChange={(e) => setLookupData({ ...lookupData, email: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-2">Student Date of Birth</label>
                <input type="date" required value={lookupData.dob} onChange={(e) => setLookupData({ ...lookupData, dob: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl uppercase tracking-widest">
                {isProcessing ? "Verifying..." : "Find My Profile"}
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button type="button" onClick={() => setCurrentStep(1)} className="text-blue-600 dark:text-blue-400 font-black hover:underline uppercase tracking-widest text-sm">
                New to CYT? Start Blank Form
              </button>
            </div>
          </div>
        )}

        {/* MAIN WIZARD */}
        {currentStep > 0 && (
          <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-[3rem] overflow-hidden border border-zinc-200 dark:border-zinc-800">
            
            <div className="bg-zinc-100 dark:bg-zinc-950 px-6 py-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center overflow-x-auto">
               <div className="flex gap-2">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className={`h-2 w-12 rounded-full transition-all duration-500 ${i <= currentStep ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-800"}`} />
                 ))}
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Step {currentStep} of 5</span>
            </div>

            <form onSubmit={handleSubmit} className="p-8 sm:p-12">
              
              {/* STEP 1: THE ACTOR */}
              {currentStep === 1 && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase italic">The Actor</h2>
                  
                  <div className="space-y-8">
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-3">Full Legal Name</label>
                      <input type="text" required value={formData.fullName} onChange={(e) => updateForm({ fullName: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold" />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Age (on show date)</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {AGES.map(a => (
                          <button key={a} type="button" onClick={() => updateForm({ age: a })} className={`py-4 rounded-xl font-black text-sm transition-all border ${formData.age === a ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-lg scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-blue-400"}`}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Current Grade</label>
                      <div className="grid grid-cols-4 gap-2">
                        {GRADES.map(g => (
                          <button key={g} type="button" onClick={() => updateForm({ grade: g })} className={`py-4 rounded-xl font-black text-xs transition-all border ${formData.grade === g ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-blue-400"}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-3">Student DOB</label>
                        <input type="date" required value={formData.dob} onChange={(e) => updateForm({ dob: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-3">Sex</label>
                        <div className="flex bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 gap-1">
                          {["Male", "Female"].map(s => (
                            <button key={s} type="button" onClick={() => updateForm({ sex: s })} className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.sex === s ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md" : "text-zinc-400 hover:text-zinc-600"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LOOKS */}
              {currentStep === 2 && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic">The Look</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-6 flex items-center gap-2">
                        <Ruler size={16} /> Height
                      </label>
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Feet</p>
                          <div className="flex bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 p-1">
                            {["4","5","6"].map(ft => (
                              <button key={ft} type="button" onClick={() => updateForm({ heightFt: ft })} className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${formData.heightFt === ft ? "bg-blue-600 text-white shadow-lg" : "text-zinc-400"}`}>
                                {ft}'
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Inches</p>
                          <div className="flex bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 p-1 overflow-x-auto max-w-[120px] snap-x">
                            {["0","2","4","6","8","10"].map(inch => (
                              <button key={inch} type="button" onClick={() => updateForm({ heightIn: inch })} className={`min-w-[36px] h-10 rounded-xl font-black text-sm transition-all ${formData.heightIn === inch ? "bg-blue-600 text-white shadow-lg" : "text-zinc-400"}`}>
                                {inch}"
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Hair Color</label>
                      <div className="grid grid-cols-2 gap-3">
                        {HAIR_COLORS.map(color => (
                          <button key={color} type="button" onClick={() => updateForm({ hairColor: color })} className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${formData.hairColor === color ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg border-transparent" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-blue-400"}`}>
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest">Preferred Roles</label>
                    <input type="text" value={formData.preferredRoles} onChange={(e) => updateForm({ preferredRoles: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-5 text-zinc-900 dark:text-white outline-none font-bold" placeholder="Cinderella, Baker, Witch, etc." />
                    <label className="flex items-center p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-blue-400 transition-colors">
                      <input type="checkbox" checked={formData.acceptAnyRole} onChange={(e) => updateForm({ acceptAnyRole: e.target.checked })} className="h-6 w-6 text-blue-600 rounded-lg" />
                      <span className="ml-4 font-black text-zinc-900 dark:text-white uppercase tracking-widest text-sm">Accept any role</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: THE AUDITION SONG (Updated styling and logic) */}
              {currentStep === 3 && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                  <div>
                    <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic leading-tight">The Performance</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium mt-1">Prepare 1 min 30 sec that shows your range. Act it out!</p>
                  </div>
                  
                  <div className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex gap-6 items-start ${formData.isFirstTime ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"}`} onClick={() => updateForm({ isFirstTime: !formData.isFirstTime, songTitle: "" })}>
                    <input type="checkbox" checked={formData.isFirstTime} readOnly className="h-7 w-7 text-blue-600 rounded-lg mt-1" />
                    <div>
                      <h4 className="font-black text-zinc-900 dark:text-white text-xl uppercase tracking-tight italic">Practice with a show track?</h4>
                      <p className="text-zinc-600 dark:text-zinc-400 font-medium mt-1">We will provide backing tracks for these selections on audition day.</p>
                    </div>
                  </div>

                  {formData.isFirstTime ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-4">
                      {PRESET_SONGS.map(s => (
                        <button key={s.id} type="button" onClick={() => updateForm({ songTitle: s.title })} className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${formData.songTitle === s.title ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105 z-10" : "bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 hover:border-blue-400"}`}>
                          <Music className={`mb-4 ${formData.songTitle === s.title ? "text-blue-200" : "text-zinc-400"}`} size={28} />
                          <p className="font-black text-lg uppercase leading-tight italic">{s.title}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-top-4">
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Audition Song Title</label>
                      <input type="text" value={formData.songTitle} onChange={(e) => updateForm({ songTitle: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-6 text-zinc-900 dark:text-white outline-none text-2xl font-black italic shadow-inner" placeholder="E.g. On My Own" />
                    </div>
                  )}

                  {/* TRANSFORMING MUSIC HUB */}
                  <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800">
                    <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-6">Audition Music Hub</label>
                    
                    {/* State: Preset Song Selected */}
                    {formData.isFirstTime && selectedPreset ? (
                      <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-500 p-8 rounded-[2.5rem] animate-in zoom-in-95">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                           <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                              <CheckCircle2 size={32} />
                           </div>
                           <div className="flex-1 text-center md:text-left">
                              <h3 className="font-black text-green-900 dark:text-green-400 uppercase text-xl">Track Ready!</h3>
                              <p className="text-green-700/80 dark:text-green-500/80 font-medium">We will have the accompaniment for <strong>{selectedPreset.title}</strong> ready for you at Kingdom Baptist Church.</p>
                           </div>
                           <a href={selectedPreset.youtube} target="_blank" rel="noopener noreferrer" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg">
                              <Youtube size={20} className="text-red-600" /> Practice Now
                           </a>
                        </div>
                      </div>
                    ) : (
                      /* State: Manual Music Upload */
                      <div className="relative">
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full group flex flex-col items-center justify-center gap-4 p-12 border-4 border-dashed rounded-[2rem] transition-all ${formData.musicFileName ? "bg-green-50 border-green-500 text-green-600 dark:bg-green-900/10" : "border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-400"}`}>
                          {formData.musicFileName ? (
                            <><FileAudio size={40} /><span className="font-black text-xl text-zinc-900 dark:text-white uppercase tracking-tight italic">{formData.musicFileName}</span></>
                          ) : (
                            <><div className="p-4 bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 transition-colors rounded-full"><UploadCloud size={40} /></div><span className="font-black text-lg uppercase tracking-widest text-zinc-900 dark:text-white">Upload Your Backing Track</span></>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: CONFLICTS */}
              {currentStep === 4 && (
                <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight uppercase italic leading-tight">Availability</h2>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden">
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {REHEARSAL_DATES.map((date) => {
                        const current = formData.conflicts[date.id] || { level: "available", notes: "" };
                        return (
                          <div key={date.id} className="p-6 md:grid md:grid-cols-12 gap-6 items-center">
                            <div className="col-span-5 mb-4 md:mb-0">
                              <p className="font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                {date.label}
                                {date.type === "critical" && <span className="bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full uppercase">Moving Sets</span>}
                                {date.type === "encouraged" && <span className="bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full uppercase tracking-tighter">Encouraged</span>}
                              </p>
                              <p className="text-sm font-medium text-zinc-500">{date.time}</p>
                            </div>
                            <div className="col-span-7 flex gap-1">
                                {["available", "partial", "absent"].map(lvl => (
                                  <button key={lvl} type="button" onClick={() => updateForm({ conflicts: { ...formData.conflicts, [date.id]: { level: lvl as ConflictLevel, notes: "" } } })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${current.level === lvl ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-105" : "bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>
                                    {lvl === "available" ? "Free" : lvl === "partial" ? "Late/Early" : "Absent"}
                                  </button>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: COMMITMENT */}
              {currentStep === 5 && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase italic">Rigorous Intensive</h2>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-900/40 rounded-[2.5rem] p-10">
                    <h3 className="font-black text-blue-900 dark:text-blue-500 uppercase tracking-widest text-lg mb-4 flex items-center gap-3"><AlertTriangle size={28} /> Critical: Off-Book</h3>
                    <div className="font-medium text-blue-900/80 dark:text-blue-400/80 space-y-4">
                      <p>You must arrive on July 6 knowing all lines and music for your role. This is a fast-paced show with only 2 weeks in person.</p>
                      <p><strong>Cost:</strong> $500 (Enrolled CYT students only)</p>
                    </div>
                    
                    <label className="mt-8 flex items-start bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-lg cursor-pointer hover:border-blue-600 transition-colors">
                      <input type="checkbox" required checked={formData.offBookAgreement} onChange={(e) => updateForm({ offBookAgreement: e.target.checked })} className="h-8 w-8 text-blue-600 rounded-xl mt-1" />
                      <span className="ml-5 font-black text-zinc-900 dark:text-white text-lg tracking-tight leading-tight italic uppercase">I commit to being OFF BOOK by July 6.</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Student Signature</label>
                      <input type="text" required value={formData.studentSignature} onChange={(e) => updateForm({ studentSignature: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-6 text-zinc-900 dark:text-white font-black text-2xl italic shadow-inner" placeholder="Sign Full Name" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Parent Signature (If Under 18)</label>
                      <input type="text" value={formData.parentSignature} onChange={(e) => updateForm({ parentSignature: e.target.value })} className="w-full rounded-2xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-6 text-zinc-900 dark:text-white font-black text-2xl italic shadow-inner" placeholder="Sign Full Name" />
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER NAV */}
              <div className="mt-16 pt-10 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <button type="button" onClick={handlePrev} className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 transition-all">
                  <ChevronLeft size={20} /> Back
                </button>
                
                {currentStep < 5 ? (
                  <button type="button" onClick={handleNext} className="bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all active:scale-95 group">
                    Next Step <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-70">
                    {isProcessing ? "Submitting..." : "Submit Form"} <Send size={20} />
                  </button>
                )}
              </div>

            </form>
          </div>
        )}
      </div>
    </div>
  );
}