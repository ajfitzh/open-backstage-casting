"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Monitor, Lock, 
  LogOut, Mail, Fingerprint, 
  CheckCircle2, Users,
  CreditCard, ChevronRight, History, Phone, MapPin
} from 'lucide-react';
import { switchProduction } from '@/app/actions';
import { signOut } from "next-auth/react";
import { hasPermission, Permission } from '@/app/lib/permissions'; 
import { useSimulation } from '@/app/context/SimulationContext'; 

// --- Types ---
export interface FamilyMember {
  id: number;
  name: string;
  role: string;
  age: number;
  image: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  id: string;
  address: string;
  familyMembers: FamilyMember[];
}

interface SettingsProps {
  shows: any[];
  activeId: number;
  initialUser: UserProfile;
  // We accept the REAL production role as a prop for reference/security checks
  realProductionRole: string | null; 
}

export default function SettingsClient({ shows, activeId, initialUser, realProductionRole }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  
  // 🚀 USE THE BRIDGE: Get Effective Roles & Controls
  const { 
    role: effectiveGlobalRole, 
    productionRole: effectiveProdRole, 
    simulate, 
    reset, 
    isSimulating 
  } = useSimulation();
  
  const activeShow = shows.find(s => s.id === activeId) || shows[0];

  // 1. THE CHECKER: Determines access based on EFFECTIVE (Simulated or Real) roles
  const checkAccess = (perm: Permission) => {
    const granted = hasPermission(effectiveGlobalRole, effectiveProdRole, perm);
    return {
      granted,
      level: granted ? (perm.includes('edit') || perm.includes('manage') ? 'write' : 'read') : 'locked'
    };
  };

  // 2. THE EJECTOR SEAT 💺
  // If you switch roles and lose permission for the current tab, redirect to Profile.
  useEffect(() => {
    const canSeeBilling = checkAccess('view_billing').granted;
    const canSeeSystem = checkAccess('view_cast_list').granted; // Proxy for Staff/Volunteer access

    if (activeTab === 'billing' && !canSeeBilling) setActiveTab('profile');
    if (activeTab === 'permissions' && !canSeeSystem) setActiveTab('profile');
    if (activeTab === 'context' && !canSeeSystem) setActiveTab('profile');
  }, [effectiveGlobalRole, effectiveProdRole, activeTab]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto w-full relative">
        
        {/* INNER SIDEBAR NAVIGATION */}
        <nav className="w-full lg:w-64 flex flex-col gap-1 shrink-0">
            <div className="px-4 py-4 mb-2">
                <h1 className="text-xl font-black italic tracking-tighter text-white">SETTINGS</h1>
                <p className="text-xs text-zinc-500 font-medium">Manage your backstage identity</p>
            </div>

            <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold uppercase text-zinc-600 tracking-widest mt-4 mb-2">Account</p>
                <TabButton id="profile" label="My Profile" icon={<User size={18}/>} active={activeTab} onClick={setActiveTab} />
                <TabButton id="family" label="Family Members" icon={<Users size={18}/>} active={activeTab} onClick={setActiveTab} />
                
                {/* 🔒 GATE: Only Admins & Parents see Billing */}
                {checkAccess('view_billing').granted && (
                    <TabButton id="billing" label="Billing & Donations" icon={<CreditCard size={18}/>} active={activeTab} onClick={setActiveTab} />
                )}
            </div>

            {/* 🔒 GATE: Only Staff/Contractors/Volunteers see System Tools */}
            {checkAccess('view_cast_list').granted && (
                <div className="space-y-1 animate-in slide-in-from-left-2 fade-in duration-300">
                    <p className="px-4 text-[10px] font-bold uppercase text-zinc-600 tracking-widest mt-6 mb-2">System</p>
                    <TabButton id="context" label="Workspace Context" icon={<Monitor size={18}/>} active={activeTab} onClick={setActiveTab} />
                    <TabButton id="permissions" label="Permissions (RBAC)" icon={<Shield size={18}/>} active={activeTab} onClick={setActiveTab} />
                </div>
            )}
            
            <div className="mt-auto pt-6 px-4">
                <button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all w-full text-left"
                >
                    <LogOut size={16}/> Sign Out
                </button>
            </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-h-[600px] bg-zinc-900/50 border border-white/5 rounded-3xl p-8 overflow-y-auto custom-scrollbar relative">
            
            {/* --- PROFILE TAB --- */}
            {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Profile & Contact</h2>
                            <p className="text-zinc-500 text-sm">Manage your personal contact information.</p>
                        </div>
                        <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wide">
                            {initialUser.role} {/* Always show REAL role here to avoid confusion */}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pb-8 border-b border-white/5">
                        <div className="w-24 h-24 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-3xl font-black text-zinc-700 shadow-2xl relative overflow-hidden">
                            {initialUser.name ? (
                                initialUser.name.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase()
                            ) : 'AF'}
                        </div>
                        <div className="space-y-2">
                            <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors">
                                Upload New Photo
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Full Name" value={initialUser.name} icon={<User size={16}/>} />
                        <InputGroup label="Email Address" value={initialUser.email} icon={<Mail size={16}/>} disabled />
                        <InputGroup label="Phone Number" value={initialUser.phone} icon={<Phone size={16}/>} />
                        <div className="md:col-span-2">
                             <InputGroup label="Mailing Address" value={initialUser.address} icon={<MapPin size={16}/>} />
                        </div>
                    </div>
                </div>
            )}

            {/* --- FAMILY MEMBERS TAB --- */}
            {activeTab === 'family' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Family Members</h2>
                            <p className="text-zinc-500 text-sm">Manage dependants and medical forms.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {initialUser.familyMembers.length === 0 ? (
                             <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-sm">
                                No family members linked to your account.
                             </div>
                        ) : (
                            initialUser.familyMembers.map((member) => (
                                <div key={member.id} className="group p-4 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10 rounded-xl transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 overflow-hidden relative border border-white/5">
                                            {member.image ? <img src={member.image} alt={member.name} className="w-full h-full object-cover" /> : member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-sm">{member.name}</h3>
                                            <p className="text-xs text-zinc-500">{member.role} • {member.age} yrs old</p>
                                        </div>
                                    </div>
                                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* --- WORKSPACE CONTEXT TAB --- */}
            {activeTab === 'context' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Workspace Context</h2>
                        <p className="text-zinc-500 text-sm">Select active production.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {shows.map((show) => (
                            <form key={show.id} action={switchProduction}>
                                <input type="hidden" name="productionId" value={show.id} />
                                <input type="hidden" name="redirectPath" value="/settings" />
                                <button className={`w-full group relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all ${activeId === show.id ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-black/20 border-white/5 hover:bg-black/40 hover:border-white/10'}`}>
                                    <div className="flex items-center gap-4 z-10">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black ${activeId === show.id ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                                            {show.title.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-sm font-bold ${activeId === show.id ? 'text-white' : 'text-zinc-300'}`}>{show.title}</div>
                                            <div className="text-xs font-medium text-zinc-500">{show.location}</div>
                                        </div>
                                    </div>
                                    {activeId === show.id && <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-widest z-10"><CheckCircle2 size={16}/> Active</div>}
                                </button>
                            </form>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PERMISSIONS (RBAC) TAB --- */}
            {activeTab === 'permissions' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Security Clearance</h2>
                        <p className="text-zinc-500 text-sm mb-4">
                            Your access level for <span className="text-white font-bold">{activeShow?.title}</span>.
                        </p>
                        
                        <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">
                                        {/* Display Effective Role */}
                                        Global Role: {effectiveGlobalRole}
                                        {effectiveGlobalRole !== initialUser.role && <span className="text-red-400 ml-2 text-xs uppercase">(Simulated)</span>}
                                    </h4>
                                    <p className="text-xs text-zinc-500">
                                        {/* Display Effective Production Role */}
                                        Show Role: {effectiveProdRole || "None"}
                                        {effectiveProdRole !== realProductionRole && <span className="text-red-400 ml-2 uppercase">(Simulated)</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <PermissionSection 
                            title="Production Management" 
                            permissions={[
                                { label: "Cast Grid Access", desc: "View master cast list.", ...checkAccess('view_cast_list') },
                                { label: "Casting Management", desc: "Modify roles and assignments.", ...checkAccess('manage_casting') },
                                { label: "Compliance Data", desc: "Access medical forms.", ...checkAccess('edit_compliance') },
                            ]}
                        />
                        
                        <PermissionSection 
                            title="Financials & Sensitive Data" 
                            permissions={[
                                { label: "Budget Reports", desc: "View production budget.", ...checkAccess('view_financials') },
                                { label: "Billing & Invoices", desc: "View personal billing history.", ...checkAccess('view_billing') },
                                { label: "Sensitive Reports", desc: "View incident reports.", ...checkAccess('view_sensitive_reports') },
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* --- BILLING TAB --- */}
            {activeTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Billing & Donations</h2>
                            <p className="text-zinc-500 text-sm">Manage payment methods.</p>
                        </div>
                    </div>
                     <div className="p-12 border border-dashed border-zinc-800 bg-black/20 rounded-2xl flex flex-col items-center justify-center text-center">
                        <CreditCard size={48} className="text-zinc-700 mb-4" />
                        <h3 className="text-zinc-400 font-bold mb-2">No Payment Methods</h3>
                        <button className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg border border-white/5">
                            Add Payment Method
                        </button>
                     </div>
                </div>
            )}

        </div>

        {/* 3. THE DEV WIDGET (GOD MODE) */}
        {/* Only visible to REAL Admins/Execs to prevent hacking */}
        {['Admin', 'Executive Director'].includes(initialUser.role) && (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10">
                <div className="bg-zinc-950 border border-red-500/30 shadow-2xl rounded-xl p-4 w-72 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-3 text-red-400 border-b border-white/5 pb-2">
                        <Shield size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">God Mode</span>
                        <button 
                            onClick={reset}
                            className="ml-auto text-[9px] underline text-zinc-500 hover:text-white"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Simulate Global Role</label>
                            <select 
                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                value={isSimulating ? effectiveGlobalRole : ""}
                                onChange={(e) => simulate(e.target.value || null, effectiveProdRole)}
                            >
                                <option value="">Real ({initialUser.role})</option>
                                <option value="Executive Director">Executive Director (You)</option>
                                <option value="Finance Manager">Finance Manager</option>
                                <option value="Production Coordinator">Prod. Coordinator</option>
                                <option value="Staff">Generic Staff</option>
                                <option value="Contractor">Contractor</option>
                                <option value="Parent/Guardian">Parent</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Simulate Show Role</label>
                            <select 
                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                value={effectiveProdRole || ""}
                                onChange={(e) => simulate(effectiveGlobalRole === initialUser.role ? null : effectiveGlobalRole, e.target.value || null)}
                            >
                                <option value="">Real ({realProductionRole || "None"})</option>
                                <option value="Director">Director</option>
                                <option value="Choreographer">Choreographer</option>
                                <option value="Stage Manager">Stage Manager</option>
                                <option value="Producer">Producer</option>
                                <option value="None">None (Standard)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                        <div className={`h-2 w-2 rounded-full mt-0.5 ${checkAccess('view_financials').granted ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="text-[10px] text-zinc-400">
                            {checkAccess('view_financials').granted ? "Can See Money" : "Cannot See Money"}
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}

// --- SUB-COMPONENTS (Keep these same as before) ---
function TabButton({ id, label, icon, active, onClick }: any) {
    const isActive = active === id;
    return (
        <button 
            onClick={() => onClick(id)}
            className={`
                group flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all w-full text-left relative overflow-hidden
                ${isActive ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}
            `}
        >
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
            <span className={`${isActive ? 'text-blue-400' : 'group-hover:text-zinc-400'}`}>{icon}</span>
            {label}
        </button>
    )
}

function InputGroup({ label, value, icon, disabled }: any) {
    return (
        <div className="group">
            <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">{label}</label>
            <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                ${disabled 
                    ? 'bg-zinc-900/30 border-white/5 text-zinc-600 cursor-not-allowed' 
                    : 'bg-black/20 border-white/10 text-white group-hover:border-white/20 focus-within:border-blue-500/50 focus-within:bg-black/40'}
            `}>
                <div className={`${disabled ? 'text-zinc-700' : 'text-zinc-500'}`}>{icon}</div>
                <input 
                    defaultValue={value} 
                    disabled={disabled}
                    readOnly={disabled}
                    className="bg-transparent outline-none w-full text-sm font-medium placeholder-zinc-700"
                />
                {disabled && <Lock size={12} className="text-zinc-700"/>}
            </div>
        </div>
    )
}

function PermissionSection({ title, permissions }: { title: string, permissions: any[] }) {
    return (
        <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{title}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {permissions.map((p: any, i: number) => (
                    <div key={i} className={`p-4 rounded-xl border flex items-start gap-4 ${p.granted ? 'bg-zinc-900/80 border-white/10' : 'bg-transparent border-white/5 opacity-50'}`}>
                        <div className={`mt-0.5 ${p.granted ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            {p.granted ? <CheckCircle2 size={18}/> : <Lock size={18}/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className={`text-sm font-bold ${p.granted ? 'text-white' : 'text-zinc-500'}`}>{p.label}</h4>
                                {p.granted && (
                                    <span className="text-[10px] uppercase font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-white/5">
                                        {p.level}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 leading-snug">{p.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}