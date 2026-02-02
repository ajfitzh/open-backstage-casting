"use client";

import React, { useState } from 'react';
import { 
  Sparkles, History, Plus, Copy, CheckCircle2, 
  AlertCircle, BookOpen, Clock, ArrowRight, Loader2
} from 'lucide-react';
import { claimBountyAction, submitProposalAction } from '@/app/lib/actions'; // We'll make these next

export default function TeacherPortalClient({ 
    teacherName, 
    history = [], 
    bounties = [], 
    currentSession 
}: any) {
    const [view, setView] = useState<'dashboard' | 'proposal'>('dashboard');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- PROPOSAL FORM STATE ---
    // If we are cloning, we pre-fill these
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        objectives: "",
        ageRange: "8-12",
        type: "General"
    });

    const handleClone = (cls: any) => {
        setFormData({
            name: cls.name,
            description: cls.description || "",
            objectives: cls.objectives || "",
            ageRange: cls.ageRange,
            type: cls.type
        });
        setView('proposal');
    };

    const handleClaim = async (bountyId: number) => {
        if(!confirm("Claim this core class? This signals to the Director that you are ready to teach it.")) return;
        setIsSubmitting(true);
        await claimBountyAction(bountyId, teacherName);
        setIsSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await submitProposalAction({ ...formData, teacher: teacherName, session: currentSession });
        setIsSubmitting(false);
        setView('dashboard');
        alert("Proposal Submitted!");
    };

    // --- DERIVED LISTS ---
    const activeClasses = history.filter((c:any) => c.status === 'Active' || c.status === 'Drafting');
    const proposedClasses = history.filter((c:any) => c.status === 'Proposed');
    const pastClasses = history.filter((c:any) => c.status === 'Completed' || c.status === 'Archived');

    if (view === 'proposal') {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <button onClick={() => setView('dashboard')} className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ArrowRight size={14} className="rotate-180"/> Back to Dashboard
                </button>
                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tight mb-1">New Class Proposal</h2>
                    <p className="text-zinc-500 text-sm mb-8">Pitch a class for {currentSession}.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Class Title</label>
                            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Age Range</label>
                                <select value={formData.ageRange} onChange={e => setFormData({...formData, ageRange: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none">
                                    <option>5-7</option><option>8-12</option><option>13-18</option><option>18+</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Category</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none">
                                    <option>Acting</option><option>Improv</option><option>Musical Theater</option><option>Dance</option><option>Tech</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Class Description (Public)</label>
                            <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="What will they do?"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-blue-400 mb-2 flex items-center gap-2"><BookOpen size={14}/> Learning Objectives (Admin Only)</label>
                            <textarea required rows={3} value={formData.objectives} onChange={e => setFormData({...formData, objectives: e.target.value})} className="w-full bg-blue-900/10 border border-blue-500/20 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="What specific skills will students master? (e.g., 'Projecting voice to back of room', 'Time-steps')"/>
                        </div>
                        <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50">
                            {isSubmitting ? "Sending..." : "Submit Proposal"}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-12">
            
            {/* 1. BOUNTY BOARD (The "Vegetables") */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><AlertCircle size={20}/></div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic text-white tracking-tight">Open Opportunities</h2>
                        <p className="text-xs text-zinc-500">We need instructors for these core classes.</p>
                    </div>
                </div>
                
                {bounties.length === 0 ? (
                    <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-600 text-sm">No open positions right now.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bounties.map((b: any) => (
                            <div key={b.id} className="bg-zinc-900 border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase rounded border border-amber-500/20">Core Class</span>
                                        <span className="text-xs font-bold text-zinc-500">{b.ageRange}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-4">{b.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
                                        <Clock size={12}/> {b.day}s @ {b.time}
                                    </div>
                                    <button onClick={() => handleClaim(b.id)} disabled={isSubmitting} className="w-full py-2 bg-white text-black font-black text-xs uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors">
                                        I Can Teach This
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 2. CURRENT / PROPOSED WORKLOAD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                     <h2 className="text-sm font-black uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2"><Sparkles size={14}/> Active & Proposed</h2>
                     <div className="space-y-3">
                        <button onClick={() => { setFormData({ name: "", description: "", objectives: "", ageRange: "8-12", type: "General" }); setView('proposal'); }} className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                            <Plus size={16}/> Propose New Idea
                        </button>
                        
                        {[...activeClasses, ...proposedClasses].map((c: any) => (
                            <div key={c.id} className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-zinc-200">{c.name}</h4>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">{c.session} • {c.status}</p>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${c.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : c.status === 'Proposed' ? 'bg-blue-500' : 'bg-zinc-700'}`}/>
                            </div>
                        ))}
                     </div>
                </section>

                {/* 3. HISTORY (CLONE) */}
                <section>
                    <h2 className="text-sm font-black uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2"><History size={14}/> Class History</h2>
                    <div className="space-y-3">
                        {pastClasses.map((c: any) => (
                            <div key={c.id} className="group bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex justify-between items-center hover:bg-zinc-900 transition-colors">
                                <div>
                                    <h4 className="font-bold text-zinc-400 group-hover:text-zinc-200">{c.name}</h4>
                                    <p className="text-[10px] text-zinc-600 uppercase font-bold mt-1">{c.session} • {c.students} Students</p>
                                </div>
                                <button onClick={() => handleClone(c)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 transition-all">
                                    <Copy size={12}/> Propose Again
                                </button>
                            </div>
                        ))}
                         {pastClasses.length === 0 && <p className="text-zinc-600 text-xs italic">No teaching history found.</p>}
                    </div>
                </section>
            </div>

        </div>
    );
}