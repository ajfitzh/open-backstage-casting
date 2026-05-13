"use client";

import React, { useState } from 'react';
import { CheckCircle2, Circle, User, DollarSign, FileText, Camera, Ruler, AlertCircle, Search } from 'lucide-react';
import ActorProfileModal from './ActorProfileModal'; // 🟢 Import the modal

export interface Student {
  id: string | number;
  name: string;
  avatar: string | null;
  status?: string; 
  signedAgreement: boolean;
  paidFees: boolean;
  headshotSubmitted: boolean;
  measurementsTaken: boolean;
  // allow additional dynamic properties from the database for the profile modal
  [key: string]: any; 
}

interface ComplianceDashboardProps {
  students?: Student[];
  productionTitle: string; 
}

export default function ComplianceDashboard({ students = [], productionTitle = "Select a Production" }: ComplianceDashboardProps) {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🟢 State to track which student is currently being inspected
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
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

  // Filter Logic for Jenny's "God View"
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

      {/* TOOLBAR: Search and Tabs */}
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
              <th className="px-6 py-5 text-center">Headshot</th>
              <th className="px-6 py-5 text-center">Measurements</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).map((student, index) => {
              const isCast = student.status === 'Cast';
              
              return (
                <tr key={`${student.id}-${index}`} className="hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-6 py-4 font-black flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border-2 border-zinc-700 overflow-hidden shrink-0">
                      {student.avatar ? <img src={student.avatar} alt={student.name} className="w-full h-full object-cover"/> : <User size={18} />}
                    </div>
                    <span className="text-zinc-200 group-hover:text-white transition-colors text-base">
                      {student.name}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    {getStatusBadge(student.status)}
                  </td>
                  
                  <ComplianceCell isCast={isCast} checked={student.signedAgreement} icon={<FileText size={16}/>} />
                  <ComplianceCell isCast={isCast} checked={student.paidFees} icon={<DollarSign size={16}/>} />
                  <ComplianceCell isCast={isCast} checked={student.headshotSubmitted} icon={<Camera size={16}/>} />
                  <ComplianceCell isCast={isCast} checked={student.measurementsTaken} icon={<Ruler size={16}/>} />
                  
                  <td className="px-6 py-4 text-right">
                    {/* 🟢 Hooked up onClick to set the selected student */}
                    <button 
                      onClick={() => setSelectedStudent(student)}
                      className="text-zinc-500 font-bold uppercase tracking-widest hover:text-white text-[10px] hover:bg-zinc-800 px-4 py-2 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-600 shadow-sm"
                    >
                      Profile
                    </button>
                  </td>
                </tr>
              )
            })}
            
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-bold">
                  No students match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🟢 Render the Actor Profile Modal if a student is selected */}
      {selectedStudent && (
        <ActorProfileModal 
          actor={selectedStudent} 
          grades={selectedStudent.grades} // Safely passes undefined if no grades exist yet
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
      <button 
        className={`inline-flex items-center justify-center p-2.5 rounded-full transition-all duration-300 shadow-sm ${
          checked ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-zinc-400'
        }`}
        title={checked ? "Completed" : "Action Required"}
      >
        {checked ? <CheckCircle2 size={18} /> : icon}
      </button>
    </td>
  );
};