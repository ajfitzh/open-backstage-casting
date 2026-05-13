/* eslint-disable react-hooks/exhaustive-deps */
// app/components/audition-wizard/VocalRangeTester.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Activity, CheckCircle2, ChevronLeft, Music, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getMidiNote(frequency: number): number {
  return Math.round(12 * (Math.log(frequency / 440) / Math.log(2))) + 69;
}

function getNoteString(midiNote: number): string {
  return NOTE_STRINGS[midiNote % 12] + (Math.floor(midiNote / 12) - 1);
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; 

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.subarray(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
  }

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

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

  // 🟢 AUTO-TRAINER STATE
  const [trainerDirection, setTrainerDirection] = useState<'up' | 'down' | null>(null);
  const [trainerTarget, setTrainerTarget] = useState<number | null>(null);
  
  // Refs for background logic loops
  const trainerTargetRef = useRef<number | null>(null);
  const trainerDirectionRef = useRef<'up' | 'down' | null>(null);
  const matchFramesRef = useRef(0);
  const lastAdvanceTimeRef = useRef(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
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
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  };

  // 🟢 START AUTO-TRAINER
  const startAutoTrainer = () => {
      setTrainerDirection('up');
      setTrainerTarget(60); // Start at Middle C
      trainerDirectionRef.current = 'up';
      trainerTargetRef.current = 60;
      matchFramesRef.current = 0;
      playNote(60, 1.0);
  };

  const switchTrainerToLows = () => {
      setTrainerDirection('down');
      setTrainerTarget(60); // Reset to Middle C and go down
      trainerDirectionRef.current = 'down';
      trainerTargetRef.current = 60;
      matchFramesRef.current = 0;
      playNote(60, 1.0);
  };

  const stopAutoTrainer = () => {
      setTrainerDirection(null);
      setTrainerTarget(null);
      trainerDirectionRef.current = null;
      trainerTargetRef.current = null;
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
      setLowestMidi(999); 
      setHighestMidi(0);
      
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
    
    if (pitchInHz !== -1 && pitchInHz > 50 && pitchInHz < 2000) {
      const midi = getMidiNote(pitchInHz);
      const noteStr = getNoteString(midi);
      
      setCurrentNote(noteStr);
      setCurrentMidi(midi);
      setLowestMidi(prev => Math.min(prev, midi));
      setHighestMidi(prev => Math.max(prev, midi));

      // 🟢 AUTO-TRAINER LOGIC LOOP
      const target = trainerTargetRef.current;
      const dir = trainerDirectionRef.current;
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();

      if (target && dir && (now - lastAdvanceTimeRef.current > 500)) { // 500ms cooldown between advancements
          // Leniency: +/- 1 half-step for kids
          if (Math.abs(midi - target) <= 1) {
              matchFramesRef.current++;
              // If they hold it for ~15 frames (approx 0.25 seconds)
              if (matchFramesRef.current > 15) {
                  const nextTarget = dir === 'up' ? target + 1 : target - 1;
                  
                  // Update Refs for logic
                  trainerTargetRef.current = nextTarget;
                  matchFramesRef.current = 0;
                  lastAdvanceTimeRef.current = now;
                  
                  // Update State for UI
                  setTrainerTarget(nextTarget);
                  
                  // Provide auditory feedback
                  playNote(nextTarget, 1.0);
              }
          } else {
              matchFramesRef.current = 0; // Reset if they waver off pitch
          }
      }

    } else {
      setCurrentNote("--");
      setCurrentMidi(null);
      matchFramesRef.current = 0;
    }

    animationRef.current = requestAnimationFrame(detectPitch);
  };

  const handleApply = () => {
    if (lowestMidi === 999 || highestMidi === 0) return;
    let voiceType = "Flexible";
    if (lowestMidi >= 60) voiceType = "Soprano";
    else if (lowestMidi >= 53) voiceType = "Alto";
    else if (lowestMidi >= 48) voiceType = "Tenor";
    else if (lowestMidi >= 43) voiceType = "Baritone";
    else if (lowestMidi < 43) voiceType = "Bass";

    onRangeFound(voiceType, getNoteString(lowestMidi), getNoteString(highestMidi));
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
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 font-medium">Use the Auto-Trainer or Free Sing on the Keyboard!</p>
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
             <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="bg-zinc-900 rounded-xl border border-white/5 p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Lowest Hit</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400">{lowestMidi !== 999 ? getNoteString(lowestMidi) : "--"}</span>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-white/5 p-3 flex flex-col justify-center shadow-sm">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Highest Hit</span>
                    <span className="text-xl sm:text-2xl font-bold text-purple-400">{highestMidi !== 0 ? getNoteString(highestMidi) : "--"}</span>
                </div>
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

      {/* 🟢 THE AUTO-TRAINER UI */}
      {isRecording && (
        <div className={`rounded-xl border p-4 mb-6 transition-all duration-300 ${trainerDirection ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-zinc-900 border-white/5'}`}>
           {!trainerDirection ? (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div>
                       <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2"><Sparkles size={16} className="text-indigo-400"/> Auto-Trainer</h4>
                       <p className="text-xs text-zinc-400 mt-1">Let the app guide you up and down the scale automatically!</p>
                   </div>
                   <button type="button" onClick={startAutoTrainer} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95 whitespace-nowrap">
                       Start Guided Test
                   </button>
               </div>
           ) : (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 animate-pulse shrink-0">
                           <Mic size={20} />
                       </div>
                       <div>
                           <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">
                               {trainerDirection === 'up' ? "Testing Highs..." : "Testing Lows..."}
                           </p>
                           <p className="text-sm text-white font-medium">
                               Match pitch <strong>{getNoteString(trainerTarget!)}</strong> to continue!
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

      {/* 🟢 INTERACTIVE PIANO */}
      <div className="mb-4">
          <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 flex justify-between px-1">
            <span>Interactive Keyboard (Click to Play)</span>
          </div>
          
          <div className="relative flex w-full h-24 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-inner select-none touch-none">
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

      {highestMidi !== 0 && !isRecording && (
          <button type="button" onClick={handleApply} className="w-full mt-6 py-4 bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]">
              <CheckCircle2 size={18} className="text-emerald-500" /> Apply Results to Form
          </button>
      )}
    </div>
  );
}