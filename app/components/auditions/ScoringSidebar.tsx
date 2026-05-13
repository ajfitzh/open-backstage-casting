import { X, MessageSquare, Save, User, Music, Star, Move } from 'lucide-react';
import { JudgeRole, ROLE_THEMES, Performer } from './AuditionsClient';
// Drop this near the top of ScoringSidebar.tsx
import React, { useRef, useState } from 'react';

function NormalizedAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [isNormalized, setIsNormalized] = useState(false);
  const [error, setError] = useState(false);

  const handlePlay = () => {
    // Browsers require user interaction before starting an AudioContext.
    // Putting it inside the onPlay event guarantees the user clicked play!
    if (!audioRef.current || contextRef.current) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      contextRef.current = ctx;

      // 1. Grab the audio from the HTML element
      const source = ctx.createMediaElementSource(audioRef.current);

      // 2. Create the Auto-Leveler (Compressor)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -30; // Start compressing very early
      compressor.knee.value = 20;       // Smooth transition
      compressor.ratio.value = 12;      // Aggressively squash loud peaks
      compressor.attack.value = 0.003;  // React instantly
      compressor.release.value = 0.25;  // Smooth release

      // 3. Add Makeup Gain (Boost the overall volume since we squashed the peaks)
      const makeUpGain = ctx.createGain();
      makeUpGain.gain.value = 2.5; // Boost by 2.5x

      // 4. Wire it all together: Source -> Compressor -> Gain -> Speakers
      source.connect(compressor);
      compressor.connect(makeUpGain);
      makeUpGain.connect(ctx.destination);

      setIsNormalized(true);
    } catch (e) {
      console.error("Web Audio API failed. Playing raw audio.", e);
      setError(true);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        crossOrigin="anonymous" // 🚨 CRITICAL for Web Audio API
        src={src}
        className="w-full outline-none"
        onPlay={handlePlay}
      />
      {isNormalized && !error && (
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Auto-Leveling Active</span>
        </div>
      )}
    </div>
  );
}
// --- HELPER COMPONENT: RUBRIC SLIDER ---
const RubricSlider = ({ label, val, setVal, disabled }: { label: string, val: number, setVal: (n: number) => void, disabled: boolean }) => (
  <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
    <div className="flex justify-between items-end">
      <label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
        {label === "Vocal Ability" && <Music size={14} className="text-purple-500" />}
        {label === "Acting / Reads" && <Star size={14} className="text-blue-500" />}
        {label === "Dance / Movement" && <Move size={14} className="text-emerald-500" />}
        {label}
      </label>
      <span className={`text-xl font-black ${val > 0 ? 'text-white' : 'text-zinc-700'}`}>{val || "-"}</span>
    </div>
    <input 
      type="range" min="0" max="5" step="1" value={val} 
      onChange={(e) => setVal(Number(e.target.value))} 
      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
      aria-label={`Score for ${label}`} 
    />
    <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-600 px-1">
      <span>N/A</span>
      <span>Weak</span>
      <span>Fair</span>
      <span>Good</span>
      <span>Great</span>
      <span>Exc.</span>
    </div>
  </div>
);

interface ScoringSidebarProps {
  selectedPerson: Performer;
  setSelectedPerson: (person: Performer | null) => void;
  judgeRole: JudgeRole;
  currentScores: { vocal: number; acting: number; dance: number; presence: number; notes: string };
  setCurrentScores: React.Dispatch<React.SetStateAction<{ vocal: number; acting: number; dance: number; presence: number; notes: string }>>;
  handleCommit: () => void;
  calculateWeightedScore: (scores: any) => number;
}

export default function ScoringSidebar({
  selectedPerson,
  setSelectedPerson,
  judgeRole,
  currentScores,
  setCurrentScores,
  handleCommit,
  calculateWeightedScore
}: ScoringSidebarProps) {
  
  return (
    <aside className="fixed inset-0 z-[200] w-full bg-zinc-950 flex flex-col md:relative md:w-[420px] md:border-l md:border-white/10 md:z-50">
        <div className="p-6 pb-4 border-b border-white/5 bg-zinc-900/50">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 overflow-hidden shadow-inner border border-white/10 shrink-0">
                {selectedPerson.avatar ? <img src={selectedPerson.avatar} className="w-full h-full object-cover" alt={selectedPerson.name} /> : <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={32} /></div>}
              </div>
              <div>
                <h2 className="text-2xl font-black italic uppercase leading-none tracking-tight">{selectedPerson.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">{selectedPerson.isWalkIn ? "Walk-In" : `Age ${selectedPerson.age}`}</span>
                    {!selectedPerson.isWalkIn && <span className="border border-zinc-700 text-zinc-500 px-2 py-1 rounded text-[10px] font-bold uppercase">{selectedPerson.timeSlot}</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedPerson(null)} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close Panel"><X size={24}/></button>
         </div>
       </div>

       <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* 🟢 LOBBY ALERT: Now safely reading direct property */}
          {selectedPerson.lobbyNote && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Lobby Alert
              </p>
              <p className="text-amber-100 text-xs font-medium">{selectedPerson.lobbyNote}</p>
            </div>
          )}

          {selectedPerson.video && (
             <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative group shadow-2xl">
                <video src={selectedPerson.video} controls className="w-full h-full object-contain" poster={selectedPerson.avatar || undefined} />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase text-white pointer-events-none border border-white/10">Audition Tape</div>
             </div>
          )}

{/* 🟢 AUDIO PLAYER: Now with Auto-Leveling! */}
          {selectedPerson.backingTrack && (
            <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl shadow-inner">
               <p className="text-[9px] font-black uppercase tracking-widest text-purple-500 mb-2 flex items-center gap-1">
                 <Music size={12}/> Backing Track
               </p>
               
               {/* Use the new component here! */}
               <NormalizedAudioPlayer src={selectedPerson.backingTrack} />
               
               <p className="text-[9px] text-zinc-600 font-bold mt-2 italic text-center">
                 Make sure your device is connected to the Bluetooth speaker.
               </p>
            </div>
          )}

          <div className={`p-4 rounded-xl border ${ROLE_THEMES[judgeRole].color} bg-zinc-900/50`}>
              <div className="flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Your Rating</p>
                    <p className="text-3xl font-black tabular-nums leading-none">{calculateWeightedScore(currentScores).toFixed(1)} <span className="text-sm text-zinc-600 font-normal">/ 5.0</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase text-zinc-500 font-bold leading-relaxed">{judgeRole} Priority:<br/><span className="text-zinc-300">{judgeRole === "Director" ? "Acting 70% | Vocal 30%" : ROLE_THEMES[judgeRole].weight}</span></p>
                </div>
              </div>
          </div>

          <div className="space-y-6">
              <RubricSlider label="Vocal Ability" val={currentScores.vocal} setVal={(v) => setCurrentScores((s) => ({ ...s, vocal: v }))} disabled={judgeRole !== "Music" && judgeRole !== "Admin"} />
              <RubricSlider label="Acting / Reads" val={currentScores.acting} setVal={(v) => setCurrentScores((s) => ({ ...s, acting: v }))} disabled={judgeRole !== "Director" && judgeRole !== "Admin"} />
              {(judgeRole === "Choreographer" || judgeRole === "Admin") && (
                <RubricSlider label="Dance / Movement" val={currentScores.dance} setVal={(v) => setCurrentScores((s) => ({ ...s, dance: v }))} disabled={false} />
              )}
              <RubricSlider label="Stage Presence" val={currentScores.presence} setVal={(v) => setCurrentScores((s) => ({ ...s, presence: v }))} disabled={judgeRole !== "Director" && judgeRole !== "Admin"} />
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="text-xs uppercase text-zinc-500 font-bold mb-3 block tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Notes</label>
            <textarea className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl text-sm min-h-[100px] focus:border-blue-500 outline-none resize-none transition-all placeholder:text-zinc-700" placeholder={`Internal notes for ${selectedPerson.name}...`} value={currentScores.notes} onChange={(e) => setCurrentScores((s) => ({ ...s, notes: e.target.value }))} />
          </div>
       </div>

       <div className="p-6 border-t border-white/10 bg-zinc-900/50">
         <button onClick={handleCommit} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
           <Save size={18} />
           {selectedPerson.isWalkIn ? "Submit Walk-In" : "Save Score"}
         </button>
       </div>
    </aside>
  );
}