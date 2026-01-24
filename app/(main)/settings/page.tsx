"use client";

import React, { useState } from 'react';
import { 
  Save, 
  User, 
  Bell, 
  Shield, 
  Monitor, 
  Smartphone,
  CreditCard 
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  // Mock User Data (would come from Baserow Table 610)
  const user = {
    name: "Austin Fitzhugh",
    email: "austin@cytfred.org",
    role: "Artistic Director",
    baserowId: "142", // The ID from your Roles table
    activeProduction: "Wizard of Oz (2026)"
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-zinc-400 mt-2">
            Manage your profile, notifications, and show context.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation for Settings */}
          <nav className="flex flex-col space-y-1">
            <SettingsTab 
              label="General" 
              icon={<User size={18} />} 
              isActive={activeTab === 'general'} 
              onClick={() => setActiveTab('general')} 
            />
            <SettingsTab 
              label="Appearance" 
              icon={<Monitor size={18} />} 
              isActive={activeTab === 'appearance'} 
              onClick={() => setActiveTab('appearance')} 
            />
            <SettingsTab 
              label="Notifications" 
              icon={<Bell size={18} />} 
              isActive={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')} 
            />
            <SettingsTab 
              label="Permissions" 
              icon={<Shield size={18} />} 
              isActive={activeTab === 'permissions'} 
              onClick={() => setActiveTab('permissions')} 
            />
          </nav>

          {/* Main Form Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* SECTION: Profile Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    defaultValue={user.name}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue={user.email}
                    disabled
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Managed by Baserow Admin (Table 610)</p>
                </div>
              </div>
            </div>

            {/* SECTION: Active Show Context (CRITICAL) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Smartphone size={120} />
              </div>
              
              <h2 className="text-lg font-semibold text-emerald-400 mb-2">Active Production Context</h2>
              <p className="text-sm text-zinc-400 mb-6 max-w-lg">
                This setting controls which show data you see in the Staff Deck and Casting tools. 
                Changing this affects your entire session.
              </p>

              <div className="max-w-md">
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase">Current Show Scope</label>
                <select title='dropdown'
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  defaultValue="oz"
                >
                  <option value="oz">Wizard of Oz (Winter 2026)</option>
                  <option value="white_christmas">White Christmas (Fall 2025)</option>
                  <option value="archive">View Archives...</option>
                </select>
              </div>
            </div>

            {/* SECTION: Permissions Debug (Helpful for you) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Role & Identity</h2>
              <div className="flex items-center gap-4 mb-4">
                 <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                    {user.role}
                 </div>
                 <div className="text-zinc-500 text-xs font-mono">
                    Baserow ID: {user.baserowId}
                 </div>
              </div>
              <p className="text-sm text-zinc-400">
                You have access to: <span className="text-zinc-200">Casting, Callbacks, Staff Deck, Compliance Reports.</span>
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                <Save size={18} />
                Save Changes
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

// Sub-component for the tab buttons
function SettingsTab({ label, icon, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        isActive 
          ? 'bg-zinc-800 text-white shadow-sm' 
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      }`}
    >
      <span className={isActive ? 'text-emerald-500' : 'text-zinc-500'}>{icon}</span>
      {label}
    </button>
  );
}