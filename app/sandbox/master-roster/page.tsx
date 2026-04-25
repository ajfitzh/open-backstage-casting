'use client';

import { useState, useEffect, useMemo } from 'react';

// --- DATA GENERATOR ---
const generateMassiveRoster = () => {
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'Elijah', 'Sophia', 'James', 'Charlotte', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  const roster = [];
  for (let i = 0; i < 76; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    
    // Simulate the real-world chaos
    roster.push({
      id: (1000 + i).toString(),
      name: `${fName} ${lName}`,
      avatar: `https://i.pravatar.cc/150?u=${2000 + i}`,
      role: i < 15 ? 'Lead / Supporting' : 'Ensemble',
      
      // The "13 Forms" broken down into trackable booleans
      compliance: {
        // Legal & Registration
        regFee: Math.random() > 0.1,         // 90% paid
        medicalForm: Math.random() > 0.2,    // 80% complete
        studentCTC: Math.random() > 0.3,     // 70% complete
        parentCTC: Math.random() > 0.3,      // 70% complete
        
        // Show Logistics
        headshot: Math.random() > 0.4,       // 60% complete
        measurements: Math.random() > 0.5,   // 50% complete
        castBio: Math.random() > 0.6,        // 40% complete
        conflictsSubmitted: Math.random() > 0.2, // 80% complete
        
        // Parent Requirements
        committeeSignedUp: Math.random() > 0.4, // 60% complete
        castPartyPaid: Math.random() > 0.5,     // 50% complete ($5 pizza money)
      },
      
      // Fun metadata for the expanded row
      conflictCount: Math.floor(Math.random() * 4), // 0 to 3 conflicts
      committeeRole: Math.random() > 0.4 ? 'Sets / Build' : 'Unassigned',
      pizzaPreference: Math.random() > 0.5 ? 'Cheese' : 'Pepperoni',
    });
  }
  return roster;
};

export default function MasterRosterSandbox() {
  const [students, setStudents] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState('All');
  
  // Track which row is expanded
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    setStudents(generateMassiveRoster().sort((a, b) => a.name.localeCompare(b.name)));
    setHasMounted(true);
  }, []);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    return {
      total: students.length,
      missingCTC: students.filter(s => !s.compliance.studentCTC || !s.compliance.parentCTC).length,
      missingBios: students.filter(s => !s.compliance.castBio).length,
      missingCommittees: students.filter(s => !s.compliance.committeeSignedUp).length,
      missingPartyFees: students.filter(s => !s.compliance.castPartyPaid).length,
    };
  }, [students]);

  // --- TOGGLE COMPLIANCE ---
  const handleToggleCompliance = (id: string, field: string) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return {
          ...s,
          compliance: { ...s.compliance, [field]: !s.compliance[field] }
        };
      }
      return s;
    }));
  };

  // --- FILTERING LOGIC ---
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterView === 'All') return true;
    if (filterView === 'Missing CTC') return !s.compliance.studentCTC || !s.compliance.parentCTC;
    if (filterView === 'Missing Bios') return !s.compliance.castBio;
    if (filterView === 'Missing Committees') return !s.compliance.committeeSignedUp;
    if (filterView === 'Missing Party Fees') return !s.compliance.castPartyPaid;
    return true;
  });

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (!hasMounted) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-black tracking-widest text-xs uppercase">Loading Master Roster...</div>;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* SIDEBAR (Visual Only) */}
      <aside className="hidden md:flex h-full shrink-0 flex-col w-64 border-r border-slate-800 bg-slate-900/50">
        <div className="h-16 flex items-center border-b border-slate-800 px-6 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tighter text-indigo-500">OPEN<span className="text-white">BACKSTAGE</span></h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Business Office</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold border border-indigo-500/20 flex items-center gap-3">
            <i className="fas fa-users"></i> Master Roster
          </div>
          <div className="px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-bold transition-colors flex items-center gap-3">
            <i className="fas fa-file-invoice-dollar"></i> Reports & Fees
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-950">
        
        {/* HEADER */}
        <header className="p-6 border-b border-slate-800 shrink-0 bg-slate-900/30">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white mb-1">Compliance & Onboarding</h1>
              <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                Production: <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Little Mermaid Jr.</span>
              </p>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Cast</div>
              <div className="text-3xl font-black text-white leading-none">{stats.total}</div>
            </div>
          </div>

          {/* DASHBOARD STATS & FILTERS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <button onClick={() => setFilterView('All')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'All' ? 'bg-slate-800 border-slate-600 shadow-lg' : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">View All</p>
              <p className="text-lg font-black text-white">{stats.total}</p>
            </button>
            <button onClick={() => setFilterView('Missing CTC')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing CTC' ? 'bg-rose-500/10 border-rose-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-rose-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1 flex items-center gap-1.5"><i className="fas fa-file-signature"></i> Missing CTC</p>
              <p className="text-lg font-black text-rose-100">{stats.missingCTC}</p>
            </button>
            <button onClick={() => setFilterView('Missing Bios')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Bios' ? 'bg-amber-500/10 border-amber-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1.5"><i className="fas fa-pen-nib"></i> Missing Bios</p>
              <p className="text-lg font-black text-amber-100">{stats.missingBios}</p>
            </button>
            <button onClick={() => setFilterView('Missing Committees')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Committees' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-indigo-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-1.5"><i className="fas fa-users-cog"></i> Unassigned Vol.</p>
              <p className="text-lg font-black text-indigo-100">{stats.missingCommittees}</p>
            </button>
            <button onClick={() => setFilterView('Missing Party Fees')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Party Fees' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-emerald-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5"><i className="fas fa-pizza-slice"></i> $5 Party Fees</p>
              <p className="text-lg font-black text-emerald-100">{stats.missingPartyFees}</p>
            </button>
          </div>

          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
            <input type="text" placeholder="Search cast members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 ring-indigo-500 outline-none text-white"/>
          </div>
        </header>

        {/* MASTER DATA TABLE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
          <div className="border border-slate-800 rounded-xl shadow-2xl bg-slate-900 absolute left-6 right-6 top-6">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Performer</th>
                  <th className="px-4 py-4 text-center">Cast Bio</th>
                  <th className="px-4 py-4 text-center">Med Release</th>
                  <th className="px-4 py-4 text-center">Student CTC</th>
                  <th className="px-4 py-4 text-center">Parent CTC</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No performers match this filter.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <React.Fragment key={student.id}>
                      
                      {/* TOP LEVEL ROW */}
                      <tr onClick={() => toggleRow(student.id)} className={`transition-colors group cursor-pointer ${expandedRowId === student.id ? 'bg-indigo-900/10' : 'hover:bg-slate-800/30'}`}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={student.avatar} alt={student.name} className={`w-10 h-10 rounded-full object-cover shadow-md border ${expandedRowId === student.id ? 'border-indigo-500' : 'border-slate-700'}`} />
                              {student.conflictCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-slate-900" title={`${student.conflictCount} Conflicts`}>
                                  {student.conflictCount}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className={`font-bold text-base transition-colors ${expandedRowId === student.id ? 'text-indigo-400' : 'text-white'}`}>{student.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{student.role}</p>
                            </div>
                          </div>
                        </td>
                        
                        {/* HIGH PRIORITY QUICK TOGGLES */}
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${student.compliance.castBio ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                            {student.compliance.castBio ? <i className="fas fa-check"></i> : <i className="fas fa-pen"></i>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${student.compliance.medicalForm ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                            {student.compliance.medicalForm ? <i className="fas fa-check"></i> : <i className="fas fa-notes-medical"></i>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${student.compliance.studentCTC ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                            {student.compliance.studentCTC ? <i className="fas fa-check"></i> : <i className="fas fa-times"></i>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${student.compliance.parentCTC ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                            {student.compliance.parentCTC ? <i className="fas fa-check"></i> : <i className="fas fa-times"></i>}
                          </div>
                        </td>
                        
                        <td className="px-6 py-3 text-right">
                          <i className={`fas fa-chevron-down text-slate-500 transition-transform ${expandedRowId === student.id ? 'rotate-180 text-indigo-400' : ''}`}></i>
                        </td>
                      </tr>

                      {/* EXPANDED DETAILS DRAWER */}
                      {expandedRowId === student.id && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b border-indigo-500/20">
                            <div className="bg-slate-900/50 p-6 shadow-inner animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* Logistics Block */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Admin & Costs</h4>
                                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">Registration Fee</span>
                                    <button onClick={() => handleToggleCompliance(student.id, 'regFee')} className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${student.compliance.regFee ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                                      {student.compliance.regFee ? 'Paid' : 'Unpaid'}
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">Cast Party ($5)</span>
                                    <button onClick={() => handleToggleCompliance(student.id, 'castPartyPaid')} className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${student.compliance.castPartyPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                                      {student.compliance.castPartyPaid ? 'Paid' : 'Unpaid'}
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-slate-500 italic">Pizza Pref: {student.pizzaPreference}</p>
                                </div>

                                {/* Show Requirements Block */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Production Needs</h4>
                                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">Headshot</span>
                                    <button onClick={() => handleToggleCompliance(student.id, 'headshot')} className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${student.compliance.headshot ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white'}`}>
                                      {student.compliance.headshot ? 'Uploaded' : 'Missing'}
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">Measurements</span>
                                    <button onClick={() => handleToggleCompliance(student.id, 'measurements')} className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${student.compliance.measurements ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white'}`}>
                                      {student.compliance.measurements ? 'Submitted' : 'Missing'}
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">Cast Bio</span>
                                    <button onClick={() => handleToggleCompliance(student.id, 'castBio')} className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${student.compliance.castBio ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white'}`}>
                                      {student.compliance.castBio ? 'Approved' : 'Missing'}
                                    </button>
                                  </div>
                                </div>

                                {/* Parent Requirements Block */}
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Parent Involvement</h4>
                                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300">Committee</span>
                                    <button onClick={() => handleToggleCompliance(student.id, 'committeeSignedUp')} className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${student.compliance.committeeSignedUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'}`}>
                                      {student.compliance.committeeSignedUp ? 'Signed Up' : 'Missing'}
                                    </button>
                                  </div>
                                  <p className="text-xs font-medium text-slate-400 pl-3">
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-0.5">Assigned Role:</span>
                                    {student.compliance.committeeSignedUp ? student.committeeRole : <span className="text-rose-400/50 italic">None</span>}
                                  </p>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}