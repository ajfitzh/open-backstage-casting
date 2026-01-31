"use client";

import { useState, useMemo } from 'react';
import { 
  Crown, Users, Megaphone, GraduationCap, 
  LayoutGrid, ChevronDown, Heart, TrendingUp, 
  Home, Sparkles 
} from 'lucide-react';

const SEASON_STAFF = [
  { name: "Aimee Mestler", role: "Executive Director", initials: "AM", color: "bg-indigo-600", icon: <Crown size={12}/> },
  { name: "Krista McKinley", role: "Business Manager", initials: "KM", color: "bg-emerald-600", icon: <Users size={12}/> },
  { name: "Jenny Adler", role: "Production Coord", initials: "JA", color: "bg-pink-600", icon: <Megaphone size={12}/> },
  { name: "Elizabeth Davis", role: "Education Coord", initials: "ED", color: "bg-blue-600", icon: <GraduationCap size={12}/> },
];

// --- HELPER: SMART SORT ---
function getSessionValue(sessionName: string) {
  if (!sessionName) return 0;
  const parts = sessionName.split(' ');
  let year = 0;
  let term = 0;
  parts.forEach(p => {
    if (p.match(/^\d{4}$/)) year = parseInt(p);
    if (p.includes('Winter')) term = 1;  // Winter is early in the year
    if (p.includes('Spring')) term = 4;
    if (p.includes('Summer')) term = 6;
    if (p.includes('Fall')) term = 9;    // Fall is late in the year
  });
  // Result: 202601 (Winter 26), 202509 (Fall 25)
  return (year * 100) + term;
}

export default function SeasonContext({ 
  initialSeason, 
  allClasses = [], 
  activeShowStats 
}: any) {
  
  // 1. EXTRACT & SORT SEASONS (Chronological)
  const sessions = useMemo(() => {
    const unique = Array.from(new Set(allClasses.map((c: any) => c.session).filter(Boolean)));
    // 🚨 FIX: Use the smart sorter (Newest First)
    return unique.sort((a: any, b: any) => getSessionValue(b) - getSessionValue(a));
  }, [allClasses]);

  // Default to the Active Show's season, or the newest one found
  const [selectedSeason, setSelectedSeason] = useState(initialSeason || sessions[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 2. CALCULATE REAL STATS
  const stats = useMemo(() => {
    // Filter classes for this specific season
    const seasonClasses = allClasses.filter((c: any) => c.session === selectedSeason);
    
    // A. Total Class Enrollment (Sum of all student counts)
    const academyCount = seasonClasses.reduce((acc: number, c: any) => acc + (c.students || 0), 0);
    
    // B. Cast Count (Only accurate if selected season == active show season)
    const isCurrentSeason = selectedSeason === initialSeason;
    const castCount = isCurrentSeason ? (activeShowStats?.castCount || 0) : 0; 

    // C. Total "Active" Students
    const totalStudents = academyCount + castCount;
    
    // D. Family Estimate (We don't have family IDs in the class list, so we estimate)
    // To get this exact, we'd need to fetch 1000+ student records. Estimate is faster.
    const familyCount = Math.floor(totalStudents * 0.75); 

    return { academyCount, familyCount, totalStudents, castCount };
  }, [allClasses, selectedSeason, initialSeason, activeShowStats]);

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Heart size={300} className="text-pink-500 rotate-12"/>
        </div>

        {/* HEADER: Pivot Control */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 relative z-10">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <LayoutGrid size={14} className="text-blue-500" /> Organization
                    </h2>
                    <span className="text-zinc-700">/</span>
                    
                    {/* THE SEASON PICKER */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {selectedSeason} <ChevronDown size={12} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-white/10">
                                {sessions.map((s: any) => (
                                    <button
                                        key={s}
                                        onClick={() => { setSelectedSeason(s); setIsMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors border-b border-white/5 ${selectedSeason === s ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <h3 className="text-2xl font-black italic text-white tracking-tight">
                    Season Overview
                </h3>
            </div>
            
            {/* Staff Strip */}
            <div className="flex flex-wrap gap-3">
                {SEASON_STAFF.map((staff, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-950 border border-white/5 rounded-full p-1.5 pr-4 shadow-sm hover:border-white/10 transition-colors cursor-default">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md ${staff.color}`}>
                            {staff.initials}
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-bold text-zinc-300">{staff.name.split(' ')[0]}</span>
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">{staff.role.split(' ')[0]}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {/* 1. Class Enrollment (Real) */}
            <MetricBox 
                icon={<GraduationCap size={20} />} 
                color="blue" 
                value={stats.academyCount} 
                label="Class Enrollment" 
            />
            {/* 2. Show Cast (Real for current, 0 for past) */}
             <MetricBox 
                icon={<Sparkles size={20} />} 
                color="purple" 
                value={stats.castCount > 0 ? stats.castCount : "N/A"} 
                label="Show Cast" 
            />
            {/* 3. Families (Estimated) */}
            <MetricBox 
                icon={<Home size={20} />} 
                color="emerald" 
                value={`~${stats.familyCount}`} 
                label="Est. Families" 
            />
            {/* 4. Total Reach (Sum) */}
            <MetricBox 
                icon={<TrendingUp size={20} />} 
                color="pink" 
                value={stats.totalStudents} 
                label="Total Reach" 
            />
        </div>
    </div>
  );
}

function MetricBox({ icon, color, value, label }: any) {
    const colors: any = {
        blue: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
        pink: "bg-pink-500/10 text-pink-400 group-hover:bg-pink-500/20",
        purple: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20",
    };

    return (
        <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex flex-col justify-between h-32 hover:bg-black/60 transition-colors group">
            <div className={`p-2 w-fit rounded-lg mb-2 transition-colors ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <div className="text-3xl font-black text-white">{value}</div>
                <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">{label}</div>
            </div>
        </div>
    )
}