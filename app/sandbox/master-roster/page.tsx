'use client';

import { useState, useEffect, useMemo } from 'react';

// --- DATA GENERATOR ---
const generateMassiveRoster = () => {
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'Elijah', 'Sophia', 'James', 'Charlotte', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore', 'Abigail', 'Jack', 'Emily', 'Levi', 'Elizabeth', 'Alexander', 'Mila', 'Jackson', 'Ella', 'Mateo', 'Avery', 'Daniel', 'Sofia', 'Michael', 'Camila', 'Mason', 'Aria', 'Sebastian', 'Scarlett', 'Ethan', 'Victoria', 'Logan', 'Madison', 'Owen', 'Luna', 'Samuel', 'Grace', 'Jacob', 'Chloe', 'Asher', 'Penelope', 'Aiden', 'Layla'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
  
  const roster = [];
  for (let i = 0; i < 76; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    
    roster.push({
      id: (1000 + i).toString(),
      name: `${fName} ${lName}`,
      avatar: `https://i.pravatar.cc/150?u=${2000 + i}`, // Changed seed so faces look different than audition deck
      role: i < 15 ? 'Lead / Supporting' : 'Ensemble',
      compliance: {
        agreement: Math.random() > 0.2, // 80% complete
        fees: Math.random() > 0.3,      // 70% complete
        headshot: Math.random() > 0.4,  // 60% complete
        measurements: Math.random() > 0.5 // 50% complete
      }
    });
  }
  return roster;
};

export default function MasterRosterSandbox() {
  const [students, setStudents] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState('All');

  useEffect(() => {
    setStudents(generateMassiveRoster().sort((a, b) => a.name.localeCompare(b.name)));
    setHasMounted(true);
  }, []);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    return {
      total: students.length,
      missingAgreements: students.filter(s => !s.compliance.agreement).length,
      missingFees: students.filter(s => !s.compliance.fees).length,
      missingHeadshots: students.filter(s => !s.compliance.headshot).length,
      missingMeasurements: students.filter(s => !s.compliance.measurements).length,
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
    if (filterView === 'Missing Agreements') return !s.compliance.agreement;
    if (filterView === 'Missing Fees') return !s.compliance.fees;
    if (filterView === 'Missing Headshots') return !s.compliance.headshot;
    if (filterView === 'Missing Measurements') return !s.compliance.measurements;
    return true;
  });

  if (!hasMounted) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-black tracking-widest text-xs uppercase">Loading Roster...</div>;

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
          <div className="px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-bold transition-colors flex items-center gap-3">
            <i className="fas fa-tshirt"></i> Costuming Dept.
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-950">
        
        {/* HEADER */}
        <header className="p-6 border-b border-slate-800 shrink-0 bg-slate-900/30">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white mb-1">Staff Portal: Compliance & Onboarding</h1>
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
            <button onClick={() => setFilterView('Missing Agreements')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Agreements' ? 'bg-rose-500/10 border-rose-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-rose-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">Missing Agreements</p>
              <p className="text-lg font-black text-rose-100">{stats.missingAgreements}</p>
            </button>
            <button onClick={() => setFilterView('Missing Fees')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Fees' ? 'bg-rose-500/10 border-rose-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-rose-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">Missing Fees</p>
              <p className="text-lg font-black text-rose-100">{stats.missingFees}</p>
            </button>
            <button onClick={() => setFilterView('Missing Headshots')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Headshots' ? 'bg-amber-500/10 border-amber-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Missing Headshots</p>
              <p className="text-lg font-black text-amber-100">{stats.missingHeadshots}</p>
            </button>
            <button onClick={() => setFilterView('Missing Measurements')} className={`p-3 rounded-xl border text-left transition-all ${filterView === 'Missing Measurements' ? 'bg-amber-500/10 border-amber-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Missing Measurements</p>
              <p className="text-lg font-black text-amber-100">{stats.missingMeasurements}</p>
            </button>
          </div>

          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
            <input type="text" placeholder="Search cast members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 ring-indigo-500 outline-none text-white"/>
          </div>
        </header>

        {/* MASTER DATA TABLE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Performer</th>
                  <th className="px-4 py-4 text-center">Agreement</th>
                  <th className="px-4 py-4 text-center">Fees Paid</th>
                  <th className="px-4 py-4 text-center">Headshot</th>
                  <th className="px-4 py-4 text-center">Measurements</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No performers match this filter.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-4">
                          <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full border border-slate-700 object-cover shadow-md" />
                          <div>
                            <p className="font-bold text-white text-base">{student.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{student.role}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* COMPLIANCE TOGGLES */}
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggleCompliance(student.id, 'agreement')} className={`p-2 rounded-lg transition-all ${student.compliance.agreement ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-600 bg-slate-950 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-800'}`}>
                          {student.compliance.agreement ? <i className="fas fa-check-circle text-lg"></i> : <i className="far fa-circle text-lg"></i>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggleCompliance(student.id, 'fees')} className={`p-2 rounded-lg transition-all ${student.compliance.fees ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-600 bg-slate-950 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-800'}`}>
                          {student.compliance.fees ? <i className="fas fa-check-circle text-lg"></i> : <i className="far fa-circle text-lg"></i>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggleCompliance(student.id, 'headshot')} className={`p-2 rounded-lg transition-all ${student.compliance.headshot ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-600 bg-slate-950 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-800'}`}>
                          {student.compliance.headshot ? <i className="fas fa-camera text-lg"></i> : <i className="fas fa-camera text-lg opacity-40"></i>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggleCompliance(student.id, 'measurements')} className={`p-2 rounded-lg transition-all ${student.compliance.measurements ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-600 bg-slate-950 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-800'}`}>
                          {student.compliance.measurements ? <i className="fas fa-ruler text-lg"></i> : <i className="fas fa-ruler text-lg opacity-40"></i>}
                        </button>
                      </td>
                      
                      <td className="px-6 py-3 text-right">
                        <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:border-transparent transition-all">
                          Edit Profile
                        </button>
                      </td>
                    </tr>
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