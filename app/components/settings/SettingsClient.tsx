"use client";

import React, { useState } from 'react';
import { 
  User, Bell, Shield, Monitor, Lock, 
  LogOut, Mail, Fingerprint, Building2, 
  CheckCircle2, XCircle, LayoutGrid, Calendar,
  Users
} from 'lucide-react';
import { switchProduction } from '@/app/actions';

export default function SettingsClient({ shows, activeId }: { shows: any[], activeId: number }) {
  const [activeTab, setActiveTab] = useState('general');
  
  // Mock User Data (In a real app, this comes from your Auth provider/cookie)
  const user = {
    name: "Austin Fitzhugh",
    email: "austin@cytfred.org",
    role: "Artistic Director",
    id: "142",
    permissions: ["manage_casting", "view_sensitive_reports", "edit_compliance"]
  };

  const activeShow = shows.find(s => s.id === activeId) || shows[0];

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
            <TabButton id="general" label="General" icon={<User size={18}/>} active={activeTab} onClick={setActiveTab} />
            <TabButton id="appearance" label="Appearance" icon={<Monitor size={18}/>} active={activeTab} onClick={setActiveTab} />
            <TabButton id="notifications" label="Notifications" icon={<Bell size={18}/>} active={activeTab} onClick={setActiveTab} />
            <TabButton id="permissions" label="Permissions" icon={<Shield size={18}/>} active={activeTab} onClick={setActiveTab} />
            
            <div className="mt-auto pt-8 border-t border-white/5">
                <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all w-full text-left">
                    <LogOut size={18}/> Sign Out
                </button>
            </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 bg-zinc-900/50 border border-white/5 rounded-3xl p-8 overflow-y-auto custom-scrollbar">
            
            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-6">Profile & Identity</h2>
                        
                        {/* ID CARD */}
                        <div className="flex items-center gap-6 p-6 bg-zinc-900 rounded-2xl border border-white/5 shadow-xl">
                            <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-emerald-900/40">
                                AF
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{user.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-[10px] font-bold uppercase text-zinc-400">
                                        {user.role}
                                    </span>
                                    <span className="text-xs text-zinc-600 font-mono">ID: {user.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup label="Full Name" value={user.name} icon={<User size={16}/>} />
                        <InputGroup label="Email Address" value={user.email} icon={<Mail size={16}/>} disabled />
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Workspace Context</h3>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-zinc-500 mb-4">This setting controls which production data loads by default when you log in.</p>
                            
                            <div className="grid grid-cols-1 gap-2">
                                {shows.map((show) => (
                                    <form key={show.id} action={switchProduction}>
                                        <input type="hidden" name="productionId" value={show.id} />
                                        <input type="hidden" name="redirectPath" value="/settings" />
                                        <button 
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${activeId === show.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-zinc-800 border-transparent hover:border-zinc-700'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${activeId === show.id ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                                                <div className="text-left">
                                                    <div className={`text-sm font-bold ${activeId === show.id ? 'text-white' : 'text-zinc-400'}`}>{show.title}</div>
                                                    <div className="text-[10px] uppercase font-bold text-zinc-600">{show.location} • {show.season}</div>
                                                </div>
                                            </div>
                                            {activeId === show.id && <CheckCircle2 size={16} className="text-emerald-500"/>}
                                        </button>
                                    </form>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PERMISSIONS TAB --- */}
            {activeTab === 'permissions' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-6">Security Clearance</h2>
                    
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-8 flex items-start gap-3">
                        <Lock size={20} className="text-amber-500 shrink-0 mt-0.5"/>
                        <div>
                            <h4 className="text-sm font-bold text-amber-400 mb-1">Role-Based Access Control</h4>
                            <p className="text-xs text-amber-200/70 leading-relaxed">
                                Your permissions are determined by your role in the <strong>Volunteers Table (619)</strong>. 
                                To request elevated access, please contact the Production Manager.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PermissionCard 
                            label="Casting Management" 
                            desc="Access to Auditions, Callbacks, and Cast Grid."
                            granted={user.permissions.includes('manage_casting')}
                            icon={<Users size={18}/>}
                        />
                        <PermissionCard 
                            label="Financial Reports" 
                            desc="View revenue, budgets, and fee collection status."
                            granted={user.permissions.includes('view_financials')}
                            icon={<Building2 size={18}/>}
                        />
                        <PermissionCard 
                            label="Sensitive Data" 
                            desc="Access to medical forms and liability waivers."
                            granted={user.permissions.includes('view_sensitive_reports')}
                            icon={<Fingerprint size={18}/>}
                        />
                        <PermissionCard 
                            label="Schedule Editor" 
                            desc="Ability to modify rehearsal times and calls."
                            granted={user.permissions.includes('edit_schedule')} // Mock false
                            icon={<Calendar size={18}/>}
                        />
                    </div>
                </div>
            )}

            {/* --- APPEARANCE TAB (Placeholder) --- */}
            {activeTab === 'appearance' && (
                <div className="text-center py-20 text-zinc-500 animate-in fade-in slide-in-from-right-4 duration-300">
                    <Monitor size={48} className="mx-auto mb-4 opacity-20"/>
                    <h3 className="text-lg font-bold text-zinc-400">System Theme</h3>
                    <p className="text-sm mt-2">Open Backstage is locked to <strong>Dark Mode</strong> for theater environments.</p>
                </div>
            )}

             {/* --- NOTIFICATIONS TAB (Placeholder) --- */}
             {activeTab === 'notifications' && (
                <div className="text-center py-20 text-zinc-500 animate-in fade-in slide-in-from-right-4 duration-300">
                    <Bell size={48} className="mx-auto mb-4 opacity-20"/>
                    <h3 className="text-lg font-bold text-zinc-400">Notifications</h3>
                    <p className="text-sm mt-2">Email and Push notification settings coming in v2.0.</p>
                </div>
            )}

        </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TabButton({ id, label, icon, active, onClick }: any) {
    return (
        <button 
            onClick={() => onClick(id)}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left
                ${active === id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}
            `}
        >
            {icon}
            {label}
        </button>
    )
}

function InputGroup({ label, value, icon, disabled }: any) {
    return (
        <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 ml-1">{label}</label>
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${disabled ? 'bg-zinc-900/50 border-white/5 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 border-white/10 text-white focus-within:border-blue-500'}`}>
                <div className="text-zinc-500">{icon}</div>
                <input 
                    value={value} 
                    disabled={disabled}
                    readOnly={disabled}
                    className="bg-transparent outline-none w-full text-sm font-bold"
                />
            </div>
            {disabled && <p className="text-[10px] text-zinc-600 mt-1 ml-1 flex items-center gap-1"><Lock size={8}/> Managed by Admin</p>}
        </div>
    )
}

function PermissionCard({ label, desc, granted, icon }: any) {
    return (
        <div className={`p-4 rounded-xl border flex items-start gap-4 ${granted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/50 border-white/5 opacity-60'}`}>
            <div className={`p-2 rounded-lg ${granted ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <h4 className={`text-sm font-bold ${granted ? 'text-emerald-400' : 'text-zinc-400'}`}>{label}</h4>
                    {granted ? <CheckCircle2 size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-zinc-600"/>}
                </div>
                <p className="text-xs text-zinc-500 leading-snug">{desc}</p>
            </div>
        </div>
    )
}