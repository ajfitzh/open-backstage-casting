"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { 
  LayoutGrid, UserSquare2, MapPin, Search, 
  ClipboardList, Users, ArrowUpRight, School 
} from 'lucide-react';

export default function AcademyClient({ classes }: { classes: any[] }) {
  // Default to 'manager' so you don't lose your daily workflow
  const [activeTab, setActiveTab] = useState<'manager' | 'overview' | 'teachers'>('manager');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. FILTERING
  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.session.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classes, searchTerm]);

  // 2. ANALYTICS AGGREGATION
  const stats = useMemo(() => {
    const teachers: Record<string, number> = {};
    const classTypes: Record<string, number> = {};

    filteredClasses.forEach(c => {
      teachers[c.teacher] = (teachers[c.teacher] || 0) + c.students;
      classTypes[c.name] = (classTypes[c.name] || 0) + c.students;
    });

    const teacherData = Object.entries(teachers)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const classData = Object.entries(classTypes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { teacherData, classData };
  }, [filteredClasses]);

  return (
    <div className="h-full flex flex-col">
      {/* TOOLBAR */}
      <div className="px-8 py-4 bg-zinc-950 flex flex-col md:flex-row gap-4 border-b border-white/5 justify-between items-center">
        <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
          <TabButton 
            active={activeTab === 'manager'} 
            onClick={() => setActiveTab('manager')} 
            icon={<ClipboardList size={14}/>} 
            label="Class Manager" 
          />
          <TabButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
            icon={<LayoutGrid size={14}/>} 
            label="Trends" 
          />
          <TabButton 
            active={activeTab === 'teachers'} 
            onClick={() => setActiveTab('teachers')} 
            icon={<UserSquare2 size={14}/>} 
            label="Faculty" 
          />
        </div>
        
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search classes, teachers, or sessions..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20">
        
        {/* TAB 1: CLASS MANAGER (The "Old Page" Reborn) */}
        {activeTab === 'manager' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
            {filteredClasses.length > 0 ? (
              filteredClasses.map(cls => (
                <div key={cls.id} className="bg-zinc-900 border border-white/5 p-5 rounded-2xl group hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-900/10 transition-all flex flex-col">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded border border-white/5">
                      {cls.session}
                    </span>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-zinc-400 flex items-center justify-end gap-1">
                         <MapPin size={10} /> {cls.location}
                       </span>
                       {/* THE CAMPUS FIELD */}
                       {cls.campus && (
                         <span className="text-[9px] font-bold text-blue-500/80 block uppercase tracking-wide mt-0.5">
                           @{cls.campus}
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Class Info */}
                  <div className="flex-1 mb-4">
                    <h3 className="text-sm font-black text-white mb-1 leading-tight group-hover:text-blue-400 transition-colors">
                      {cls.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                      <School size={12} />
                      <span>{cls.teacher}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                       <span>{cls.day}</span>
                       <span>•</span>
                       <span>{cls.ageRange} yrs</span>
                       <span>•</span>
                       <span className={cls.students > 0 ? "text-emerald-500" : ""}>{cls.students} Enrolled</span>
                    </div>
                  </div>

                  {/* Action Buttons (Placeholder for future functionality) */}
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/5">
                    <Link 
                      href={`/education/class/${cls.id}/attendance`} 
                      className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wide hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <ClipboardList size={12} /> Attendance
                    </Link>
                    <Link 
                      href={`/education/class/${cls.id}`} 
                      className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wide hover:bg-zinc-700 hover:text-white transition-all"
                    >
                      <Users size={12} /> Roster
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-zinc-500 italic">
                No classes found matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRENDS (Popularity) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem]">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                <LayoutGrid size={16} className="text-blue-500" /> Most Popular Classes
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.classData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                    <XAxis type="number" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                    <YAxis dataKey="name" type="category" width={140} stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                      {stats.classData.map((e, i) => <Cell key={i} fill={i < 3 ? '#3b82f6' : '#27272a'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Quick Stats Sidebar */}
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col">
               <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Engagement</h3>
               <div className="space-y-4">
                  <div className="p-4 bg-zinc-950 rounded-xl border border-white/5">
                     <p className="text-[10px] font-bold text-zinc-500 uppercase">Top Performer</p>
                     <p className="text-lg font-black text-white truncate">{stats.classData[0]?.name || "N/A"}</p>
                     <p className="text-xs text-blue-500 font-bold">{stats.classData[0]?.count || 0} Students</p>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded-xl border border-white/5">
                     <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Active Sections</p>
                     <p className="text-lg font-black text-white">{filteredClasses.length}</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TAB 3: FACULTY */}
        {activeTab === 'teachers' && (
          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <UserSquare2 size={16} className="text-purple-500" /> Student Load by Instructor
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.teacherData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis dataKey="name" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                  <YAxis stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-zinc-100 text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}