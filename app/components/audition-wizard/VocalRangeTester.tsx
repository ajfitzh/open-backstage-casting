// app/components/audition-wizard/VocalRangeTester.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Activity, CheckCircle2, ChevronLeft, Music, ArrowUp, ArrowDown, Sparkles, RotateCcw, Volume2 } from "lucide-react";
import { getMidiNote, getNoteString, autoCorrelate, calculateBestVoiceType } from "@/app/lib/vocalScience";

interface VocalRangeTesterProps {
  onRangeFound: (voiceType: string, lowNote: string, highNote: string) => void;
  onStartTest?: () => void;
}

export default function VocalRangeTester({ onRangeFound, onStartTest }: VocalRangeTesterProps) {
  const [mode, setMode] = useState<"select" | "test">("select");
  const [isRecording, setIsRecording] = useState(false);
  const [currentNote, setCurrentNote] = useState<string>("--");
  const [currentMidi, setCurrentMidi] = useState<number | null>(null);
  
  const [lowestMidi, setLowestMidi] = useState<number>(999);
  const [highestMidi, setHighestMidi] = useState<number>(0);

  const [playingMidi, setPlayingMidi] = useState<number | null>(null);

  const [trainerDirection, setTrainerDirection] = useState<'up' | 'down' | null>(null);
  const [trainerTarget, setTrainerTarget] = useState<number | null>(null);
  const [trainerPhase, setTrainerPhase] = useState<'playing' | 'listening' | null>(null);
  
  const trainerTargetRef = useRef<number | null>(null);
  const trainerDirectionRef = useRef<'up' | 'down' | null>(null);
  const trainerPhaseRef = useRef<'playing' | 'listening' | null>(null);
  const lastNoteStartTimeRef = useRef(0);

  const freeSingMidiRef = useRef<number | null>(null);
  const freeSingFramesRef = useRef(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    return () => stopTest();
  }, []);

  const playNote = (midiNum: number, duration: number = 0.5) => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine'; 
    osc.frequency.value = 440 * Math.pow(2, (midiNum - 69) / 12);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1); 
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + duration - 0.2); 
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration); 

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);
  };

  const startAutoTrainer = () => {
      setTrainerDirection('up');
      setTrainerTarget(60); 
      setTrainerPhase('playing');
      
      trainerDirectionRef.current = 'up';
      trainerTargetRef.current = 60;
      trainerPhaseRef.current = 'playing';
      lastNoteStartTimeRef.current = Date.now();
      
      playNote(60, 3.0); 
  };

  const switchTrainerToLows = () => {
      setTrainerDirection('down');
      setTrainerTarget(60); 
      setTrainerPhase('playing');
      
      trainerDirectionRef.current = 'down';
      trainerTargetRef.current = 60;
      trainerPhaseRef.current = 'playing';
      lastNoteStartTimeRef.current = Date.now();
      
      playNote(60, 3.0); 
  };

  const stopAutoTrainer = () => {
      setTrainerDirection(null);
      setTrainerTarget(null);
      setTrainerPhase(null);
      
      trainerDirectionRef.current = null;
      trainerTargetRef.current = null;
      trainerPhaseRef.current = null;
  };

  const resetRange = () => {
      setLowestMidi(999);
      setHighestMidi(0);
  };

  const startTest = async () => {
    if (onStartTest) onStartTest();
    if (streamRef.current) stopTest(); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);
      resetRange();
      
      detectPitch();
    } catch (err) {
      console.error("Mic error:", err);
      alert("Please allow microphone access to test your range.");
    }
  };

  const stopTest = () => {
    setIsRecording(false);
    setCurrentNote("--");
    setCurrentMidi(null);
    stopAutoTrainer();
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null; 
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
  };

  const detectPitch = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const pitchInHz = autoCorrelate(buffer, audioContextRef.current.sampleRate);
    
    const target = trainerTargetRef.current;
    const dir = trainerDirectionRef.current;
    const now = Date.now();

    if (target && dir) {
        const elapsed = now - lastNoteStartTimeRef.current;

        if (elapsed < 3000) {
            if (trainerPhaseRef.current !== 'playing') {
                trainerPhaseRef.current = 'playing';
                setTrainerPhase('playing');
            }
        } else if (elapsed < 6000) {
            if (trainerPhaseRef.current !== 'listening') {
                trainerPhaseRef.current = 'listening';
                setTrainerPhase('listening');
            }
        } else {
            const nextTarget = dir === 'up' ? target + 1 : target - 1;
            trainerTargetRef.current = nextTarget;
            lastNoteStartTimeRef.current = now;
            setTrainerTarget(nextTarget);
            trainerPhaseRef.current = 'playing';
            setTrainerPhase('playing');
            playNote(nextTarget, 3.0);
        }
    }

    if (pitchInHz !== -1 && pitchInHz > 50 && pitchInHz < 2000) {
      const midi = getMidiNote(pitchInHz);
      const noteStr = getNoteString(midi);
      
      setCurrentNote(noteStr);
      setCurrentMidi(midi);

      if (midi === freeSingMidiRef.current) {
          freeSingFramesRef.current++;
          if (freeSingFramesRef.current > 5) {
              setLowestMidi(prev => Math.min(prev, midi));
              setHighestMidi(prev => Math.max(prev, midi));
          }
      } else {
          freeSingMidiRef.current = midi;
          freeSingFramesRef.current = 0;
      }
    } else {
      setCurrentNote("--");
      setCurrentMidi(null);
      freeSingFramesRef.current = 0;
    }

    animationRef.current = requestAnimationFrame(detectPitch);
  };

  const handleApply = () => {
    const bestMatch = calculateBestVoiceType(lowestMidi, highestMidi);
    onRangeFound(bestMatch, getNoteString(lowestMidi), getNoteString(highestMidi));
    stopTest();
  };

  const keys = [];
  for(let i=40; i<=88; i++) keys.push({ midi: i, isBlack: [1, 3, 6, 8, 10].includes(i % 12) });
  const whiteKeys = keys.filter(k => !k.isBlack);

  if (mode === "select") {
      return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0">
               <Mic size={24} />
             </div>
             <div>
               <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Vocal Range</h3>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Find your comfortable range</p>
             </div>
           </div>
           
           <div className="text-sm text-zinc-400 mb-8 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
             Please do not strain or try to &quot;max out&quot; your voice! This is just a generalized self-assessment. <strong>This will NOT affect your audition chances.</strong> 
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
              {["Soprano", "Alto", "Tenor", "Baritone", "Bass", "Not Sure"].map(v => (
                <button 
                  key={v} 
                  type="button"
                  onClick={() => v === "Not Sure" ? setMode("test") : onRangeFound(v, "", "")} 
                  className={`border text-xs font-bold py-3 sm:py-4 rounded-xl transition-all shadow-sm active:scale-95 ${
                    v === "Not Sure" 
                      ? "bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20" 
                      : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200"
                  }`}
                >
                  {v}
                </button>
              ))}
           </div>
           
           <button 
              type="button" 
              onClick={() => setMode("test")} 
              className="w-full py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl transition-colors flex items-center justify-center gap-3 group shadow-sm active:scale-[0.98]"
           >
              <div className="text-center">
                 <div className="text-sm font-black text-white flex items-center justify-center gap-2">
                    <Activity size={16} className="text-blue-500 group-hover:animate-pulse" /> Live Range Finder
                 </div>
              </div>
           </button>
        </div>
      );
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-8 w-full relative animate-in zoom-in-95 duration-200">
      <button 
         type="button" 
         onClick={() => { stopTest(); setMode("select"); }} 
         className="absolute top-4 sm:top-6 right-4 sm:right-6 text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
      >
         <ChevronLeft size={14} /> Back
      </button>

      <div className="flex items-center gap-3 mb-6 pr-16">
        <div>
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 uppercase italic tracking-tighter">
                <Activity size={20} className="text-blue-500" /> Live Range Finder
            </h3>
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 font-medium">Use the Call-and-Response Trainer or Free Sing!</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="w-full sm:w-32 h-24 sm:h-32 bg-zinc-900 rounded-xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
             {isRecording && <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>}
             <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest absolute top-2 sm:top-3">Current</span>
             <span className={`text-4xl sm:text-5xl font-black ${currentNote === "--" ? "text-zinc-700" : "text-white"}`}>
                 {currentNote}
             </span>
          </div>

          <div className="flex-1 flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-3 flex-1 relative">
                <div className="bg-zinc-900 rounded-xl border border-white/5 p-3 flex flex-col justify-center shadow-sm relative">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Lowest Hit</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400">{lowestMidi !== 999 ? getNoteString(lowestMidi) : "--"}</span>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-white/5 p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Highest Hit</span>
                    <span className="text-xl sm:text-2xl font-bold text-purple-400">{highestMidi !== 0 ? getNoteString(highestMidi) : "--"}</span>
                </div>
                
                {highestMidi !== 0 && (
                    <button 
                        onClick={resetRange} 
                        className="absolute -top-3 -right-2 bg-zinc-800 border border-zinc-700 text-zinc-300 p-1.5 rounded-full hover:bg-zinc-700 hover:text-white transition-all shadow-lg"
                        title="Reset Range Tracking"
                    >
                        <RotateCcw size={12} />
                    </button>
                )}
             </div>
             
             {!isRecording ? (
                <button type="button" onClick={startTest} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95">
                    <Mic size={16} /> Start Microphone
                </button>
            ) : (
                <button type="button" onClick={stopTest} className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95">
                    <Square size={16} /> Stop Recording
                </button>
            )}
          </div>
      </div>

      {isRecording && (
        <div className={`rounded-xl border p-4 mb-6 transition-all duration-300 ${trainerDirection ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-zinc-900 border-white/5'}`}>
           {!trainerDirection ? (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div>
                       <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2"><Sparkles size={16} className="text-indigo-400"/> Guided Warmup</h4>
                       <p className="text-xs text-zinc-400 mt-1">We'll play a pitch, and you sing it back!</p>
                   </div>
                   <button type="button" onClick={startAutoTrainer} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95 whitespace-nowrap">
                       Start Trainer
                   </button>
               </div>
           ) : (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-300 ${trainerPhase === 'playing' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 animate-pulse'}`}>
                           {trainerPhase === 'playing' ? <Volume2 size={20} /> : <Mic size={20} />}
                       </div>
                       <div>
                           <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors ${trainerPhase === 'playing' ? 'text-amber-400' : 'text-indigo-400'}`}>
                               {trainerDirection === 'up' ? "Testing Highs" : "Testing Lows"}
                           </p>
                           <p className="text-sm text-white font-medium">
                               {trainerPhase === 'playing' ? (
                                  <>Listen to <strong>{getNoteString(trainerTarget!)}</strong></>
                               ) : (
                                  <>Now sing <strong>{getNoteString(trainerTarget!)}</strong></>
                               )}
                           </p>
                       </div>
                   </div>
                   <div className="flex gap-2 w-full sm:w-auto">
                       {trainerDirection === 'up' ? (
                           <button type="button" onClick={switchTrainerToLows} className="flex-1 sm:flex-none px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                               Too High <ArrowDown size={14}/>
                           </button>
                       ) : (
                           <button type="button" onClick={stopAutoTrainer} className="flex-1 sm:flex-none px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                               Too Low <CheckCircle2 size={14}/>
                           </button>
                       )}
                   </div>
               </div>
           )}
        </div>
      )}

      <div className="mb-4">
          <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 flex justify-between px-1">
            <span>Interactive Keyboard (Swipe to view more)</span>
          </div>
          
          <div className="w-full overflow-x-auto custom-scrollbar rounded-lg border border-zinc-800 shadow-inner">
             <div className="relative flex min-w-[700px] sm:min-w-[800px] h-24 sm:h-32 bg-zinc-900 select-none touch-none">
                {whiteKeys.map((wKey) => {
                  const hasBlackKey = [0, 2, 5, 7, 9].includes(wKey.midi % 12);
                  
                  const inRange = lowestMidi !== 999 && wKey.midi >= lowestMidi && wKey.midi <= highestMidi;
                  const isSung = wKey.midi === currentMidi;
                  const isSynth = wKey.midi === playingMidi || wKey.midi === trainerTarget;
                  
                  let whiteColor = "bg-white";
                  if (inRange) whiteColor = "bg-blue-100";
                  if (isSung) whiteColor = "bg-blue-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.4)]";
                  if (isSynth) whiteColor = "bg-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.8)]";

                  const bKeyMidi = wKey.midi + 1;
                  const bInRange = lowestMidi !== 999 && bKeyMidi >= lowestMidi && bKeyMidi <= highestMidi;
                  const bIsSung = bKeyMidi === currentMidi;
                  const bIsSynth = bKeyMidi === playingMidi || bKeyMidi === trainerTarget;

                  let blackColor = "bg-zinc-800";
                  if (bInRange) blackColor = "bg-blue-900";
                  if (bIsSung) blackColor = "bg-blue-500 shadow-[0_0_10px_rgba(96,165,250,0.8)]";
                  if (bIsSynth) blackColor = "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.9)]";

                  return (
                    <div 
                      key={wKey.midi} 
                      onPointerDown={(e) => { e.preventDefault(); playNote(wKey.midi); setPlayingMidi(wKey.midi); }}
                      onPointerUp={() => setPlayingMidi(null)}
                      onPointerLeave={() => setPlayingMidi(null)}
                      className={`relative flex-1 border-r border-zinc-300 last:border-0 transition-colors duration-[50ms] cursor-pointer hover:bg-zinc-200 ${whiteColor}`}
                    >
                      {hasBlackKey && (
                          <div 
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); playNote(bKeyMidi); setPlayingMidi(bKeyMidi); }}
                            onPointerUp={(e) => { e.stopPropagation(); setPlayingMidi(null); }}
                            onPointerLeave={(e) => { e.stopPropagation(); setPlayingMidi(null); }}
                            className={`absolute top-0 -right-[50%] w-full h-[65%] z-10 border-x border-b border-zinc-950 rounded-b shadow-md transition-colors duration-[50ms] cursor-pointer hover:bg-zinc-700 ${blackColor}`}
                          />
                      )}
                    </div>
                  )
                })}
             </div>
          </div>
      </div>

      {highestMidi !== 0 && !isRecording && (
          <button type="button" onClick={handleApply} className="w-full mt-6 py-4 bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]">
              <CheckCircle2 size={18} className="text-emerald-500" /> Apply Results to Form
          </button>
      )}
    </div>
  );
}