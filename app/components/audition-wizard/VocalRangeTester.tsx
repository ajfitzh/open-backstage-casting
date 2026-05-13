// app/components/audition-wizard/VocalRangeTester.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Activity, CheckCircle2, ChevronLeft, Music, Play, ArrowUp, ArrowDown } from "lucide-react";

// --- PITCH SCIENCE MATH ---
const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getMidiNote(frequency: number): number {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function getNoteString(midiNote: number): string {
  return NOTE_STRINGS[midiNote % 12] + (Math.floor(midiNote / 12) - 1);
}

// Standard Autocorrelation Algorithm for finding pitch in a waveform
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // Not enough signal (too quiet)

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.subarray(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
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
  
  // Track boundaries
  const [lowestMidi, setLowestMidi] = useState<number>(999);
  const [highestMidi, setHighestMidi] = useState<number>(0);

  // 🟢 NEW: Synthesizer & Arpeggio State
  const [playingMidi, setPlayingMidi] = useState<number | null>(null);
  const [arpeggioRoot, setArpeggioRoot] = useState<number>(60); // Middle C defaults (C4)
  const [isArpeggioPlaying, setIsArpeggioPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    return () => stopTest();
  }, []);

  // 🟢 SYNTHESIZER: Plays a note when a key is clicked or arpeggio triggers
  const playNote = (midiNum: number, duration: number = 0.5) => {
    // If the test hasn't started yet, we need to create the context to let them play
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine'; // Warm, pure tone
    osc.frequency.value = 440 * Math.pow(2, (midiNum - 69) / 12);

    // Smooth ADSR envelope to prevent clicking sounds
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  };

  // 🟢 ARPEGGIO COACH: 1-3-5-3-1
  const playArpeggio = async () => {
      if (isArpeggioPlaying) return;
      setIsArpeggioPlaying(true);
      
      const pattern = [0, 4, 7, 4, 0]; // Major Arpeggio Intervals (Root, Major 3rd, Perfect 5th)
      
      for(let i=0; i < pattern.length; i++) {
          const noteToPlay = arpeggioRoot + pattern[i];
          setPlayingMidi(noteToPlay);
          playNote(noteToPlay, 0.6);
          await new Promise(r => setTimeout(r, 500)); // Wait half a second between notes
      }
      
      setPlayingMidi(null);
      setIsArpeggioPlaying(false);
  };

  const startTest = async () => {
    if (onStartTest) onStartTest();
    if (streamRef.current) stopTest(); // Safety cleanup

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
      console.error("Mic access denied or error:", err);
      alert("Please allow microphone access to test your range.");
    }
  };

  const stopTest = () => {
    setIsRecording(false);
    setCurrentNote("--");
    setCurrentMidi(null);
    
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
    } else {
      setCurrentNote("--");
      setCurrentMidi(null);
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

    const lowStr = getNoteString(lowestMidi);
    const highStr = getNoteString(highestMidi);
    
    onRangeFound(voiceType, lowStr, highStr);
    stopTest();
  };

  // --- PIANO GENERATOR LOGIC ---
  const keys = [];
  for(let i=40; i<=88; i++) {
     const isBlack = [1, 3, 6, 8, 10].includes(i % 12);
     keys.push({ midi: i, isBlack });
  }
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
           
           <div className="text-sm text-zinc-400 mb-8 leading-relaxed bg-zinc-900/50 p-4 rounded-xl border border-white/5">
             Please do not strain or try to &quot;max out&quot; your voice! This is just a generalized self-assessment to help you find your starting voice type. <strong>This will NOT affect your audition chances.</strong> We will do official vocal range checks with our professional Music Director at callbacks.
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
                    <Activity size={16} className="text-blue-500 group-hover:animate-pulse" /> 
                    Live Range Finder
                 </div>
                 <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">
                    Sing into your device to test interactively
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
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 font-medium">Use the Pitch Coach to find your range!</p>
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

      {/* 🟢 THE ARPEGGIO PITCH COACH */}
      <div className="bg-zinc-900 rounded-xl border border-white/5 p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
         <div className="flex flex-col items-center w-full sm:w-auto shrink-0 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-6">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Music size={12}/> Pitch Coach
            </span>
            <div className="flex items-center gap-4">
               <button type="button" onClick={() => setArpeggioRoot(p => p-1)} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                  <ArrowDown size={14} />
               </button>
               <div className="flex flex-col items-center justify-center w-12">
                   <span className="font-mono text-xl font-black text-white leading-none">{getNoteString(arpeggioRoot)}</span>
               </div>
               <button type="button" onClick={() => setArpeggioRoot(p => p+1)} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                  <ArrowUp size={14} />
               </button>
            </div>
         </div>
         
         <div className="flex-1 w-full">
            <button 
                type="button" 
                onClick={playArpeggio} 
                disabled={isArpeggioPlaying}
                className={`w-full py-3 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isArpeggioPlaying 
                    ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                    : "bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/30"
                }`}
            >
                {isArpeggioPlaying ? <Activity size={16} className="animate-pulse" /> : <Play size={16} />} 
                {isArpeggioPlaying ? "Playing..." : "Play 1-3-5-3-1 Arpeggio"}
            </button>
         </div>
      </div>

      {/* 🟢 THE INTERACTIVE PIANO VISUALIZER */}
      <div className="mb-4">
          <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-2 flex justify-between px-1">
            <span>Interactive Keyboard (Click to Play)</span>
            <span>{isRecording ? "Recording" : "Mic Off"}</span>
          </div>
          
          <div className="relative flex w-full h-24 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-inner select-none touch-none">
            {whiteKeys.map((wKey) => {
              const hasBlackKey = [0, 2, 5, 7, 9].includes(wKey.midi % 12);
              
              // Color Logic
              const inRange = lowestMidi !== 999 && wKey.midi >= lowestMidi && wKey.midi <= highestMidi;
              const isSung = wKey.midi === currentMidi;
              const isSynth = wKey.midi === playingMidi;
              
              let whiteColor = "bg-white";
              if (inRange) whiteColor = "bg-blue-100";
              if (isSung) whiteColor = "bg-blue-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.4)]";
              if (isSynth) whiteColor = "bg-amber-400 shadow-[inset_0_0_20px_rgba(245,158,11,0.8)]";

              const bKeyMidi = wKey.midi + 1;
              const bInRange = lowestMidi !== 999 && bKeyMidi >= lowestMidi && bKeyMidi <= highestMidi;
              const bIsSung = bKeyMidi === currentMidi;
              const bIsSynth = bKeyMidi === playingMidi;

              let blackColor = "bg-zinc-800";
              if (bInRange) blackColor = "bg-blue-900";
              if (bIsSung) blackColor = "bg-blue-500 shadow-[0_0_10px_rgba(96,165,250,0.8)]";
              if (bIsSynth) blackColor = "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.9)]";

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