// app/components/audition-wizard/VocalRangeTester.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Activity, CheckCircle2 } from "lucide-react";

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
  onStartTest?: () => void; // 🟢 Added prop
}

export default function VocalRangeTester({ onRangeFound, onStartTest }: VocalRangeTesterProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentNote, setCurrentNote] = useState<string>("--");
  
  // Track boundaries
  const [lowestMidi, setLowestMidi] = useState<number>(999);
  const [highestMidi, setHighestMidi] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  const startTest = async () => {
    if (onStartTest) onStartTest(); // 🟢 Trigger parent stop action

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);
      setLowestMidi(999); // Reset bounds
      setHighestMidi(0);
      
      detectPitch();
    } catch (err) {
      console.error("Mic access denied or error:", err);
      alert("Please allow microphone access to test your range.");
    }
  };

  const stopTest = () => {
    setIsRecording(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
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
      setLowestMidi(prev => Math.min(prev, midi));
      setHighestMidi(prev => Math.max(prev, midi));
    } else {
      setCurrentNote("--");
    }

    animationRef.current = requestAnimationFrame(detectPitch);
  };

  // Classify based on the highest and lowest midi notes hit during the test
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

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Live Range Finder
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">Sing your lowest note, then glide up to your highest note!</p>
        </div>
        
        {!isRecording ? (
            <button type="button" onClick={startTest} className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                <Mic size={14} /> Start Test
            </button>
        ) : (
            <button type="button" onClick={stopTest} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/50 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 animate-pulse">
                <Square size={14} /> Stop
            </button>
        )}
      </div>

      <div className="flex gap-4">
          <div className="w-24 h-24 bg-zinc-900 rounded-xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
             {isRecording && <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>}
             <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest absolute top-2">Current</span>
             <span className={`text-3xl font-black ${currentNote === "--" ? "text-zinc-700" : "text-white"}`}>
                 {currentNote}
             </span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2">
             <div className="bg-zinc-900 rounded-lg border border-white/5 p-3 flex flex-col justify-center">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Lowest Hit</span>
                <span className="text-lg font-bold text-emerald-400">{lowestMidi !== 999 ? getNoteString(lowestMidi) : "--"}</span>
             </div>
             <div className="bg-zinc-900 rounded-lg border border-white/5 p-3 flex flex-col justify-center">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Highest Hit</span>
                <span className="text-lg font-bold text-purple-400">{highestMidi !== 0 ? getNoteString(highestMidi) : "--"}</span>
             </div>
          </div>
      </div>

      {highestMidi !== 0 && !isRecording && (
          <button type="button" onClick={handleApply} className="w-full mt-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> I&apos;m done! Apply to my form
          </button>
      )}
    </div>
  );
}