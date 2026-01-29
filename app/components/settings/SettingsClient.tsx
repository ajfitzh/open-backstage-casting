"use client";

import React, { useState } from 'react';
import { 
  User, Bell, Shield, Monitor, Lock, 
  LogOut, Mail, Fingerprint, Building2, 
  CheckCircle2, XCircle, Users, Calendar,
  CreditCard, ChevronRight, History, Phone, MapPin
} from 'lucide-react';
import { switchProduction } from '@/app/actions';

// --- Types ---
type PermissionScope = 'global' | 'production_specific';
type PermissionLevel = 'read' | 'write' | 'admin';

interface Permission {
  id: string;
  label: string;
  description: string;
  scope: PermissionScope;
  level: PermissionLevel;
  granted: boolean;
}

// Updated to include the image field from Baserow
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
}

export default function SettingsClient({ shows, activeId, initialUser }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Use the real data passed from the server
  const user = initialUser;
  const activeShow = shows.find(s => s.id === activeId) || shows[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto w-full">
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="w-full lg:w-64 flex flex-col gap-1 shrink-0">
            <div className="px-4 py-4 mb-2">
                <h1 className="text-xl font-black italic tracking-tighter text-white">SETTINGS</h1>
                <p className="text-xs text-zinc-500 font-medium">Manage your backstage identity</p>
            </div>

            <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold uppercase text-zinc-600 tracking-widest mt-4 mb-2">Account</p>
                <TabButton id="profile" label="My Profile" icon={<User size={18}/>} active={activeTab} onClick={setActiveTab} />
                <TabButton id="family" label="Family Members" icon={<Users size={18}/>} active={activeTab} onClick={setActiveTab} />
                <TabButton id="billing" label="Billing & Donations" icon={<CreditCard size={18}/>} active={activeTab} onClick={setActiveTab} />
            </div>

            <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold uppercase text-zinc-600 tracking-widest mt-6 mb-2">System</p>
                <TabButton id="context" label="Workspace Context" icon={<Monitor size={18}/>} active={activeTab} onClick={setActiveTab} />
                <TabButton id="permissions" label="Permissions (RBAC)" icon={<Shield size={18}/>} active={activeTab} onClick={setActiveTab} />
            </div>
            
            <div className="mt-auto pt-6 px-4">
                <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all w-full text-left">
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
                            {user.role}
                        </div>
                    </div>

                    {/* Avatar Header */}
                    <div className="flex items-center gap-6 pb-8 border-b border-white/5">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center text-3xl font-black text-zinc-700 shadow-2xl relative overflow-hidden">
                             {/* Display Initials - Real photo logic happens in Family Tab usually, but could go here too */}
                            <span className="bg-clip-text text-transparent bg-gradient-to-tr from-zinc-200 to-zinc-500">
                                {user.name ? user.name.substring(0,2).toUpperCase() : 'AF'}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors">
                                Upload New Photo
                            </button>
                            <button className="px-4 py-2 text-zinc-400 text-xs font-bold hover:text-white transition-colors">
                                Remove
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Full Name" value={user.name} icon={<User size={16}/>} />
                        <InputGroup label="Email Address" value={user.email} icon={<Mail size={16}/>} disabled />
                        <InputGroup label="Phone Number" value={user.phone} icon={<Phone size={16}/>} />
                        <div className="md:col-span-2">
                             <InputGroup label="Mailing Address" value={user.address} icon={<MapPin size={16}/>} />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/20 transition-all">
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* --- FAMILY MEMBERS TAB (Real Data) --- */}
            {activeTab === 'family' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Family Members</h2>
                            <p className="text-zinc-500 text-sm">Manage dependants, medical forms, and conflicts.</p>
                        </div>
                        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2">
                            <Users size={14} /> Add Person
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {user.familyMembers.map((member) => (
                            <div key={member.id} className="group p-4 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10 rounded-xl transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Avatar Logic: Show Image if exists, else Initials */}
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 overflow-hidden relative border border-white/5">
                                        {member.image ? (
                                            <img 
                                                src={member.image} 
                                                alt={member.name} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            member.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm">{member.name}</h3>
                                        <p className="text-xs text-zinc-500">{member.role} • {member.age} yrs old</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white" title="View History">
                                        <History size={16} />
                                    </button>
                                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg h-fit text-amber-500">
                            <Fingerprint size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-500 mb-1">Medical Info & Waivers</h4>
                            <p className="text-xs text-zinc-400">Please ensure medical forms are updated for all students before the first rehearsal.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BILLING & DONATIONS TAB --- */}
            {activeTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Billing & Donations</h2>
                            <p className="text-zinc-500 text-sm">Manage payment methods and recurring donations.</p>
                        </div>
                    </div>
                     <div className="p-12 border border-dashed border-zinc-800 bg-black/20 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-zinc-700 transition-colors">
                        <CreditCard size={48} className="text-zinc-700 mb-4 group-hover:text-zinc-600 transition-colors" />
                        <h3 className="text-zinc-400 font-bold mb-2">No Payment Methods on File</h3>
                        <p className="text-zinc-500 text-xs max-w-sm mb-6 leading-relaxed">Add a credit card to easily pay for tuition, tickets, and production fees. All data is securely encrypted.</p>
                        <button className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors border border-white/5">
                            Add Payment Method
                        </button>
                     </div>
                </div>
            )}

            {/* --- WORKSPACE CONTEXT TAB --- */}
            {activeTab === 'context' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Workspace Context</h2>
                        <p className="text-zinc-500 text-sm">Select which show data loads by default when you log in.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {shows.map((show) => (
                            <form key={show.id} action={switchProduction}>
                                <input type="hidden" name="productionId" value={show.id} />
                                <input type="hidden" name="redirectPath" value="/settings" />
                                <button 
                                    className={`w-full group relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all ${activeId === show.id ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-black/20 border-white/5 hover:bg-black/40 hover:border-white/10'}`}
                                >
                                    <div className="flex items-center gap-4 z-10">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black ${activeId === show.id ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                                            {show.title.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-sm font-bold ${activeId === show.id ? 'text-white' : 'text-zinc-300'}`}>{show.title}</div>
                                            <div className="text-xs font-medium text-zinc-500">{show.location} • {show.season}</div>
                                        </div>
                                    </div>
                                    {activeId === show.id && (
                                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-widest z-10">
                                            <CheckCircle2 size={16}/> Active
                                        </div>
                                    )}
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
                                    <h4 className="text-sm font-bold text-white">Current Role: {user.role}</h4>
                                    <p className="text-xs text-zinc-500">Family ID: {user.id} • Table: Families (634)</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                Active Status
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <PermissionSection 
                            title="Production Management" 
                            permissions={[
                                { label: "Cast Grid Access", desc: "View and edit the master cast list.", granted: true, level: 'write' },
                                { label: "Audition Data", desc: "Access sensitive audition forms and scores.", granted: true, level: 'read' },
                            ]}
                        />
                        
                        <PermissionSection 
                            title="Financials" 
                            permissions={[
                                { label: "Budget Reports", desc: "View production budget and expenditure.", granted: false, level: 'read' },
                                { label: "Tuition Payments", desc: "Process payments and view balances.", granted: false, level: 'read' },
                            ]}
                        />

                        <PermissionSection 
                            title="Sensitive Data" 
                            permissions={[
                                { label: "Medical Forms", desc: "Access student medical emergency info.", granted: true, level: 'read' },
                                { label: "Background Checks", desc: "View volunteer compliance status.", granted: false, level: 'admin' },
                            ]}
                        />
                    </div>
                </div>
            )}

        </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

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