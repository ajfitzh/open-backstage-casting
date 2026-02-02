"use client";

import { useState, useMemo, useEffect } from 'react';
import { 
  Crown, Users, Megaphone, GraduationCap, 
  LayoutGrid, ChevronDown, Heart, TrendingUp, 
  Home, Sparkles, Calendar, Theater, Music, ArrowRight
} from 'lucide-react';

const SEASON_STAFF = [
  { name: "Aimee Mestler", role: "Executive Director", initials: "AM", color: "bg-indigo-600", icon: <Crown size={12}/> },
  { name: "Krista McKinley", role: "Business Manager", initials: "KM", color: "bg-emerald-600", icon: <Users size={12}/> },
  { name: "Jenny Adler", role: "Production Coord", initials: "JA", color: "bg-pink-600", icon: <Megaphone size={12}/> },
  { name: "Elizabeth Davis", role: "Education Coord", initials: "ED", color: "bg-blue-600", icon: <GraduationCap size={12}/> },
];

const LINEUP_FILTERS = ["All", "Fall", "Winter", "Spring", "Summer"];

// Helper to match "Fall 2025" to "2025-2026"
function isItemInSeason(itemSession: string, seasonName: string) {
    if (!itemSession || !seasonName) return false;
    if (itemSession === seasonName) return true;

    const seasonParts = seasonName.split('-');
    const startYear = parseInt(seasonParts[0]); 
    const endYear = parseInt(seasonParts[1]);   

    if (isNaN(startYear) || isNaN(endYear)) return false;

    const itemYearMatch = itemSession.match(/\d{4}/);
    if (!itemYearMatch) return false;
    const itemYear = parseInt(itemYearMatch[0]);
    const isFall = itemSession.includes("Fall");
    
    if (itemYear === startYear && isFall) return true;
    if (itemYear === endYear && !isFall) return true;

    return false;
}

export default function SeasonContext({ 
  activeSeasonName, 
  seasons = [],     
  allClasses = [], 
  allShows = [], 
  activeShowStats 
}: any) {
  
  // 1. SORT SEASONS
  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [seasons]);

  const [selectedSeasonName, setSelectedSeasonName] = useState(activeSeasonName || sortedSeasons[0]?.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lineupFilter, setLineupFilter] = useState("All"); 

  useEffect(() => {
    if (activeSeasonName) setSelectedSeasonName(activeSeasonName);
  }, [activeSeasonName]);

  // 2. FILTER DATA FOR SELECTED SEASON
  const seasonData = useMemo(() => {
      const classes = allClasses.filter((c: any) => isItemInSeason(c.session, selectedSeasonName));
      const shows = allShows.filter((s: any) => isItemInSeason(s.season, selectedSeasonName) || s.season === selectedSeasonName);
      
      const classSessions: Record<string, number> = {};
      classes.forEach((c: any) => {
          if(!classSessions[c.session]) classSessions[c.session] = 0;
          classSessions[c.session] += c.students;
      });

      return { classes, shows, classSessions };
  }, [allClasses, allShows, selectedSeasonName]);

  // 3. APPLY LINEUP FILTER (The "Buttons" Logic)
  const visibleLineup = useMemo(() => {
      if (lineupFilter === "All") return { 
          shows: seasonData.shows, 
          sessions: Object.entries(seasonData.classSessions) 
      };

      // ✅ FIX: Check title, season string, OR the specific productionSession field
      const filteredShows = seasonData.shows.filter((s: any) => 
          (s.title && s.title.includes(lineupFilter)) || 
          (s.season && s.season.includes(lineupFilter)) ||
          (s.productionSession && s.productionSession.includes(lineupFilter)) // <--- The magic fix
      );

      // Filter Class Sessions: Check the session key (e.g. "Fall 2025")
      const filteredSessions = Object.entries(seasonData.classSessions).filter(([name]) => 
          name.includes(lineupFilter)
      );

      return { shows: filteredShows, sessions: filteredSessions };
  }, [seasonData, lineupFilter]);

// 3. CALCULATE STATS
  const stats = useMemo(() => {
    // A. Count students in the classes for the SELECTED season
    const academyCount = seasonData.classes.reduce((acc: number, c: any) => acc + (c.students || 0), 0);
    
    // B. Always show the REAL active cast count (Global Stat)
    // We stop hiding this when the seasons don't match.
    const castCount = activeShowStats?.castCount || 0; 

    // C. Total Reach
    // Since cast members are required to be in classes, they are ALREADY in 'academyCount'.
    // So Total Reach = Academy Count.
    // The Cast Count is just a "subset" stat.
    const totalStudents = academyCount;
    
    // D. Family Estimate
    const familyCount = Math.floor(totalStudents * 0.75); 

    return { 
        academyCount, 
        familyCount, 
        totalStudents, 
        castCount, 
        // We still track this boolean for labeling purposes (e.g. "Historical Data")
        isCurrentSeason: selectedSeasonName === activeSeasonName 
    };
  }, [seasonData, selectedSeasonName, activeSeasonName, activeShowStats]);
  
  const currentSeasonObj = sortedSeasons.find(s => s.name === selectedSeasonName);

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all group hover:border-white/10">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Heart size={300} className="text-pink-500 rotate-12"/>
        </div>

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 relative z-20">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <LayoutGrid size={14} className="text-blue-500" /> Organization
                    </h2>
                    <span className="text-zinc-700">/</span>
                    
                    {/* SEASON PICKER */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {selectedSeasonName} <ChevronDown size={12} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-white/10">
                                {sortedSeasons.map((s: any) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setSelectedSeasonName(s.name); setIsMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex justify-between items-center ${selectedSeasonName === s.name ? 'bg-blue-500/10' : ''}`}
                                    >
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedSeasonName === s.name ? 'text-blue-400' : 'text-zinc-400'}`}>
                                            {s.name}
                                        </span>
                                        {s.status === "Active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <h3 className="text-2xl font-black italic text-white tracking-tight flex items-center gap-3">
                    Season Overview
                    {currentSeasonObj?.status === "Planning" && <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 not-italic uppercase tracking-wide">Planning</span>}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 mb-10">
            <MetricBox 
                icon={<TrendingUp size={20} />} 
                color="pink" 
                value={stats.academyCount} 
                label="Total Enrollment" 
                sub="Unique Students"
            />
            <MetricBox 
                icon={<Sparkles size={20} />} 
                color="purple" 
                value={stats.isCurrentSeason ? stats.castCount : "---"} 
                label="Active Cast" 
                dim={!stats.isCurrentSeason}
                sub="Included in Enrollment"
            />
            <MetricBox 
                icon={<Home size={20} />} 
                color="emerald" 
                value={`~${stats.familyCount}`} 
                label="Est. Families" 
                sub="Based on 0.75 ratio"
            />
            <MetricBox 
                icon={<GraduationCap size={20} />} 
                color="blue" 
                value={seasonData.classes.length} 
                label="Total Classes" 
                sub="Across all sessions"
            />
        </div>

        {/* SEASON LINEUP */}
        <div className="relative z-10 pt-6 border-t border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                    <Calendar size={12}/> Season Lineup
                </h4>
                
                {/* FILTER BUTTONS */}
                <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-white/5">
                    {LINEUP_FILTERS.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setLineupFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                lineupFilter === filter 
                                ? 'bg-zinc-800 text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. PRODUCTIONS */}
                {visibleLineup.shows.map((show: any) => (
                    <div key={show.id} className="flex items-center gap-4 bg-zinc-950/50 border border-white/5 p-4 rounded-2xl hover:bg-zinc-950 hover:border-white/10 transition-all group/card">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${show.type?.includes('Lite') ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {show.type?.includes('Lite') ? <Music size={20}/> : <Theater size={20}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-white truncate">{show.title}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                <span>{show.productionSession || "Production"}</span>
                                {show.isActive && <span className="text-emerald-500">• Active</span>}
                            </div>
                        </div>
                        {show.isActive && <ArrowRight size={14} className="text-zinc-700 group-hover/card:text-white transition-colors"/>}
                    </div>
                ))}

                {/* 2. CLASS SESSIONS */}
                {visibleLineup.sessions.map(([session, count]: any) => (
                    <div key={session} className="flex items-center gap-4 bg-zinc-950/50 border border-white/5 p-4 rounded-2xl hover:bg-zinc-950 hover:border-white/10 transition-all">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-500/10 text-pink-500 shrink-0">
                            <GraduationCap size={20}/>
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-white">{session}</h5>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                {count} Students Enrolled
                            </span>
                        </div>
                    </div>
                ))}

                {/* EMPTY STATE */}
                {visibleLineup.shows.length === 0 && visibleLineup.sessions.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/5">
                        <p className="text-zinc-500 italic text-xs font-medium">No items found for {lineupFilter}.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

function MetricBox({ icon, color, value, label, sub, dim }: any) {
    const colors: any = {
        blue: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
        pink: "bg-pink-500/10 text-pink-400 group-hover:bg-pink-500/20",
        purple: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20",
    };

    return (
        <div className={`bg-black/40 rounded-2xl p-5 border border-white/5 flex flex-col justify-between h-36 hover:bg-black/60 transition-colors group ${dim ? 'opacity-50 grayscale' : ''}`}>
            <div className={`p-2 w-fit rounded-lg mb-2 transition-colors ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <div className="text-3xl font-black text-white">{value}</div>
                <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">{label}</div>
                {sub && <div className="text-[9px] text-zinc-600 mt-1">{sub}</div>}
            </div>
        </div>
    )
}