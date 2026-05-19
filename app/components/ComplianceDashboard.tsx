// app/components/ComplianceDashboard.tsx
"use client";

import React, { useState } from 'react';
import { 
  CheckCircle2, User, DollarSign, FileText, Camera, 
  Ruler, AlertCircle, Search, ChevronDown, ChevronUp, 
  Trash2, CalendarClock, Hash
} from 'lucide-react';
import ActorProfileModal from './ActorProfileModal'; 

export interface Student {
  id: string | number;
  name: string;
  avatar: string | null;
  status?: string; 
  signedAgreement: boolean;
  paidFees: boolean;
  headshotSubmitted: boolean;
  measurementsTaken: boolean;
  
  // Audition Form Data
  auditionNumber?: string;
  timeSlot?: string;
  height?: string;
  hairColor?: string;
  preferredRoles?: string;
  vocalRange?: string;
  stageRomance?: boolean;
  willingToAlterAppearance?: boolean;
  conflicts?: string;
  otherTalents?: string;

  // Allow additional dynamic properties
  [key: string]: any; 
}

interface ComplianceDashboardProps {
  students?: Student[];
  productionTitle: string; 
  onDeleteAudition?: (id: string | number) => void;
  onChangeTimeSlot?: (id: string | number, newSlotId: string) => void;
}

export default function ComplianceDashboard({ 
  students = [], 
  productionTitle = "Select a Production",
  onDeleteAudition,
  onChangeTimeSlot
}: ComplianceDashboardProps) {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // 🟢 State to track which row is expanded for Admin View
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null);
  
  if (!students || students.length === 0) {
    return (
      <div className="bg-zinc-950 text-zinc-50 p-6 min-h-screen flex flex-col items-center justify-center">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight uppercase italic">Master Roster</h1>
          <p className="text-zinc-400 mt-2 font-bold">
            Production: <span className="text-blue-500">{productionTitle}</span>
          </p>
        </header>
        <div className="p-12 text-center border border-zinc-800 rounded-3xl bg-zinc-900/50 max-w-md shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-black text-white uppercase tracking-widest">No Auditions Found</h3>
          <p className="text-sm text-zinc-500 mt-2 font-medium">Nobody has registered for <strong className="text-zinc-300">{productionTitle}</strong> yet.</p>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const studentStatus = s.status || 'Pending';
    
    if (activeTab === 'Cast') return matchesSearch && studentStatus === 'Cast';
    if (activeTab === 'Pending') return matchesSearch && studentStatus === 'Pending';
    if (activeTab === 'Callbacks') return matchesSearch && studentStatus === 'Called Back';
    return matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    switch(status?.toLowerCase()) {
      case 'cast': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Cast</span>;
      case 'called back': return <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-500/20">Callback</span>;
      case 'not cast': return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-500/20">Not Cast</span>;
      default: return <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-700">Pending</span>;
    }
  };

  const toggleExpand = (id: string | number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  return (
    <div className="bg-zinc-950 text-zinc-50 p-6 md:p-10 pb-32 min-h-screen font-sans">
      <header className="mb-8 border-b border-zinc-900 pb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-white">Master Roster</h1>
            <p className="text-zinc-400 mt-2 font-bold text-lg">
              {productionTitle}
            </p>
          </div>
          <div className="flex gap-4">
             <div className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl text-center">
               <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total Auditions</div>
               <div className="text-3xl font-black text-white leading-none">{students.length}</div>
             </div>
             <div className="bg-emerald-900/20 border border-emerald-500/20 px-6 py-3 rounded-2xl text-center">
               <div className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest mb-1">Total Cast</div>
               <div className="text-3xl font-black text-emerald-400 leading-none">
                 {students.filter(s => s.status === 'Cast').length}
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 w-full md:w-auto overflow-x-auto">
          {['All', 'Pending', 'Callbacks', 'Cast'].map(tab => (
            <button 
              key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Search roster..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white py-3 pl-12 pr-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 ring-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-zinc-800 shadow-2xl bg-zinc-900/30">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-900/80 text-zinc-500 uppercase text-[10px] font-black tracking-widest border-b border-zinc-800">
            <tr>
              <th className="px-6 py-5">Performer</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-center">Agreement</th>
              <th className="px-6 py-5 text-center">Fees</th>
              <th className="px-6 py-5 text-center">Paperwork</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).map((student, index) => {
              const isCast = student.status === 'Cast';
              const isExpanded = expandedRowId === student.id;
              
              return (
                <React.Fragment key={`${student.id}-${index}`}>
                  <tr className={`hover:bg-zinc-800/40 transition-colors group ${isExpanded ? 'bg-zinc-800/20' : ''}`}>
                    <td className="px-6 py-4 font-black flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border-2 border-zinc-700 overflow-hidden shrink-0">
                        {student.avatar ? <img src={student.avatar} alt={student.name} className="w-full h-full object-cover"/> : <User size={18} />}
                      </div>
                      <div>
                        <span className="text-zinc-200 group-hover:text-white transition-colors text-base block">
                          {student.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          #{student.auditionNumber || 'N/A'} • {student.timeSlot || 'No Slot'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {getStatusBadge(student.status)}
                    </td>
                    
                    <ComplianceCell isCast={isCast} checked={student.signedAgreement} icon={<FileText size={16}/>} />
                    <ComplianceCell isCast={isCast} checked={student.paidFees} icon={<DollarSign size={16}/>} />
                    
                    {/* Combined Paperwork cell for cleaner table */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <div className={`p-1.5 rounded-full ${student.headshotSubmitted ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-600'}`} title="Headshot">
                          <Camera size={12} />
                        </div>
                        <div className={`p-1.5 rounded-full ${student.measurementsTaken ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-600'}`} title="Measurements">
                          <Ruler size={12} />
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedStudent(student)}
                          className="text-zinc-500 font-bold uppercase tracking-widest hover:text-white text-[10px] hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-600 shadow-sm"
                        >
                          Profile
                        </button>
                        
                        {/* 🟢 NEW EXPAND BUTTON */}
                        <button 
                          onClick={() => toggleExpand(student.id)}
                          className={`flex items-center gap-1 font-bold uppercase tracking-widest text-[10px] px-3 py-2 rounded-lg transition-colors border shadow-sm ${
                            isExpanded ? 'bg-blue-600 border-blue-500 text-white' : 'text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                          }`}
                        >
                          Admin {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* 🟢 EXPANDED ADMIN ROW */}
                  {isExpanded && (
                    <tr className="bg-black/40 border-b border-zinc-800 shadow-inner">
                      <td colSpan={6} className="px-8 py-8">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Card 1: Audition Actions */}
                            <div className="space-y-4">
                               <h4 className="text-blue-500 font-black uppercase tracking-widest text-xs border-b border-zinc-800 pb-2 flex items-center gap-2">
                                 <CalendarClock size={14} /> Audition & Scheduling
                               </h4>
                               <div className="space-y-3 text-sm">
                                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                                     <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-1"><Hash size={12}/> Audition Number</span>
                                     <span className="font-black text-white text-lg">#{student.auditionNumber || 'N/A'}</span>
                                  </div>
                                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2">
                                     <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Current Time Slot</span>
                                     <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">{student.timeSlot || 'Unknown'}</span>
                                        <button 
                                          onClick={() => {
                                            const newSlot = prompt("Enter new time slot (e.g. 5:00 PM - 6:00 PM Block):", student.timeSlot);
                                            if (newSlot && onChangeTimeSlot) onChangeTimeSlot(student.id, newSlot);
                                            else if (newSlot) alert("Note: Make sure to hook up `onChangeTimeSlot` prop in page.tsx!");
                                          }}
                                          className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 font-black uppercase tracking-widest transition-colors"
                                        >
                                          Move Slot
                                        </button>
                                     </div>
                                  </div>
                               </div>
                               <div className="pt-2">
                                 <button 
                                   onClick={() => {
                                     if(window.confirm(`Are you sure you want to delete the audition record for ${student.name}? This cannot be undone.`)) {
                                       if(onDeleteAudition) onDeleteAudition(student.id);
                                       else alert("Note: Make sure to hook up `onDeleteAudition` prop in page.tsx to call `cancelAudition()`!");
                                     }
                                   }}
                                   className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                 >
                                   <Trash2 size={14} /> Delete Audition
                                 </button>
                               </div>
                            </div>
                            
                            {/* Card 2: Casting Form Data */}
                            <div className="space-y-4">
                               <h4 className="text-emerald-500 font-black uppercase tracking-widest text-xs border-b border-zinc-800 pb-2">
                                 Raw Form Data
                               </h4>
                               <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest">Pref. Roles</span> 
                                    <span className="font-bold text-white truncate block">{student.preferredRoles || 'Any'}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest">Vocal Range</span> 
                                    <span className="font-bold text-white truncate block">{student.vocalRange || 'Unknown'}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest">Height</span> 
                                    <span className="font-bold text-white truncate block">{student.height || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest">Hair Color</span> 
                                    <span className="font-bold text-white truncate block">{student.hairColor || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest">Stage Romance</span> 
                                    <span className={`font-bold truncate block ${student.stageRomance ? 'text-emerald-400' : 'text-rose-400'}`}>{student.stageRomance ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest">Alter Hair</span> 
                                    <span className={`font-bold truncate block ${student.willingToAlterAppearance ? 'text-emerald-400' : 'text-rose-400'}`}>{student.willingToAlterAppearance ? 'Yes' : 'No'}</span>
                                  </div>
                               </div>
                            </div>

                            {/* Card 3: Conflicts & Notes */}
                            <div className="space-y-4">
                               <h4 className="text-amber-500 font-black uppercase tracking-widest text-xs border-b border-zinc-800 pb-2">
                                 Conflicts & Talents
                               </h4>
                               <div className="space-y-3">
                                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest mb-1">Stated Conflicts</span>
                                    <p className="font-bold text-white text-xs leading-relaxed">{student.conflicts || 'None listed.'}</p>
                                  </div>
                                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                    <span className="text-zinc-500 block text-[9px] uppercase font-black tracking-widest mb-1">Other Talents</span>
                                    <p className="font-bold text-white text-xs leading-relaxed">{student.otherTalents || 'None listed.'}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-bold">
                  No students match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedStudent && (
        <ActorProfileModal 
          actor={selectedStudent} 
          grades={selectedStudent.grades} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </div>
  );
}

const ComplianceCell = ({ checked, icon, isCast }: { checked: boolean; icon: React.ReactNode; isCast: boolean }) => {
  if (!isCast) {
    return <td className="px-6 py-4 text-center text-zinc-800 font-bold">-</td>;
  }
  
  return (
    <td className="px-6 py-4 text-center">
      <div 
        className={`mx-auto flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300 shadow-sm ${
          checked ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
        }`}
        title={checked ? "Completed" : "Action Required"}
      >
        {checked ? <CheckCircle2 size={16} /> : icon}
      </div>
    </td>
  );
};