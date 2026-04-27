'use client';

import React, { useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, User, HeartPulse, Info, FileSignature } from 'lucide-react';

export default function AuditionFormSandbox() {
  const [acceptAnyRole, setAcceptAnyRole] = useState<string | null>(null);

  // Grouped conflict dates for a cleaner grid UI
  const conflictDates = [
    "Fri, 3/20 (6-9pm)", "Sat, 3/21 (10am-5pm)", "Fri, 3/27 (6-9pm)", "Sat, 3/28 (10am-5pm)",
    "Fri, 4/10 (6-9pm)", "Sat, 4/11 (10am-5pm)", "Fri, 4/17 (6-9pm)", "Sat, 4/18 (10am-5pm)",
    "Fri, 4/24 (6-9pm)", "Sat, 4/25 (10am-5pm)", "Fri, 5/1 (6-9pm)", "Sat, 5/2 (10am-5pm)",
    "Fri, 5/8 (6-9pm)", "Sat, 5/9 (10am-5pm)", "Fri, 5/15 (6-9pm)", "Sat, 5/16 (10am-5pm)"
  ];

  const mandatoryDates = [
    "Fri, 5/22 (6-9pm)", "Super Saturday, 5/23 (10am-5pm)", "Mon-Thu, 5/25-5/28 (Tech Week)",
    "Fri, 5/29 (Opening Night)", "Sat-Sun, 5/30-5/31 (Shows)", "Fri-Sun, 6/5-6/7 (Shows)"
  ];

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-8 font-sans text-zinc-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-200 text-center">
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase">CYT Fredericksburg</h1>
          <h2 className="text-xl font-bold text-zinc-500 mt-1">Spring 2026 Audition Form: The Little Mermaid</h2>
          <p className="text-sm text-zinc-400 mt-2">Digital Form Demo / Sandbox Environment</p>
        </div>

        {/* CRITICAL CASTING FLAG - Moved to top for Aimee */}
        <div className={`rounded-2xl p-8 shadow-sm border-2 transition-colors ${acceptAnyRole === 'no' ? 'bg-red-50 border-red-500' : acceptAnyRole === 'yes' ? 'bg-green-50 border-green-500' : 'bg-white border-blue-500'}`}>
          <div className="flex items-start gap-4">
            <AlertTriangle className={`w-8 h-8 shrink-0 ${acceptAnyRole === 'no' ? 'text-red-600' : acceptAnyRole === 'yes' ? 'text-green-600' : 'text-blue-600'}`} />
            <div className="w-full">
              <h3 className="text-xl font-black uppercase mb-4">Critical: Are you willing to accept ANY role?</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => setAcceptAnyRole('yes')}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${acceptAnyRole === 'yes' ? 'bg-green-600 text-white shadow-lg scale-[1.02]' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                  YES, I will accept any role.
                </button>
                <button 
                  onClick={() => setAcceptAnyRole('no')}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${acceptAnyRole === 'no' ? 'bg-red-600 text-white shadow-lg scale-[1.02]' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                  NO, only specific roles.
                </button>
              </div>
              {acceptAnyRole === 'no' && (
                <p className="text-red-700 font-bold mt-4 bg-red-100 p-3 rounded-lg flex items-center gap-2">
                  <Info size={18} /> *Selecting &quot;NO&quot; may result in not being cast in the show.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 1: BASIC INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4 flex items-center gap-2">
            <User size={20} /> <h3 className="font-bold uppercase tracking-wider">Actor Profile</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-zinc-700 mb-1">Student Name</label>
              <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="First and Last Name" />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Age</label>
              <input type="number" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Sex</label>
              <select className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                <option>Select...</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Grade</label>
              <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Date of Birth</label>
              <input type="date" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Height</label>
              <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 5' 4&quot;" />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Hair Color</label>
              <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* SECTION 2: CASTING DETAILS & CONSENTS */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4 flex items-center gap-2">
            <HeartPulse size={20} /> <h3 className="font-bold uppercase tracking-wider">Casting & Consents</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Preferred Role(s)</label>
                  <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3" placeholder="Ariel, Flounder, etc." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Preferred Voice Part</label>
                  <select className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3">
                    <option>Unsure</option>
                    <option>Soprano</option>
                    <option>Alto</option>
                    <option>Tenor</option>
                    <option>Baritone/Bass</option>
                  </select>
                </div>
            </div>

            <div className="border-t border-zinc-200 pt-6 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                <span className="font-medium">I am willing to alter my appearance for a role (e.g. cutting/coloring hair).</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                <span className="font-medium">I have a fear of heights.</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                <span className="font-medium">I have skin allergies/sensitivities.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-1" />
                <div>
                  <span className="font-medium block">I am comfortable being cast in a role that includes romantic scene work.</span>
                  <span className="text-sm text-zinc-500">*CYT Fredericksburg no longer allows stage kissing of any kind.</span>
                </div>
              </label>
            </div>
            
            <div className="border-t border-zinc-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Title of Song</label>
                  <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Title of Monologue</label>
                  <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3" />
                </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: CONFLICTS */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Calendar size={20} /> <h3 className="font-bold uppercase tracking-wider">Schedule & Conflicts</h3>
            </div>
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Max 2 Allowed</span>
          </div>
          
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-900">
              <strong>Attendance Policy:</strong> You are permitted up to 2 conflicts. Exceeding this is at the Artistic Team&apos;s discretion and may affect casting. Unexcused absences or leaving early may result in removal from a scene.
            </div>

            <h4 className="font-bold mb-3 border-b pb-2">Select Known Conflicts (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {conflictDates.map((date, i) => (
                <label key={i} className="flex items-center gap-2 text-sm bg-zinc-50 p-2 rounded border border-zinc-200 hover:bg-zinc-100 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600 rounded" />
                  {date}
                </label>
              ))}
            </div>

            <h4 className="font-bold mb-3 border-b pb-2 text-red-600 flex items-center gap-2">
              Mandatory Dates <span className="text-xs font-normal text-zinc-500">(No conflicts allowed)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-700">
              {mandatoryDates.map((date, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded">
                  <AlertTriangle size={14} className="text-red-500"/> {date}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: COMMITMENT CHECKLIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4 flex items-center gap-2">
            <FileSignature size={20} /> <h3 className="font-bold uppercase tracking-wider">Commitments & Signatures</h3>
          </div>
          <div className="p-6 space-y-4">
             <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-1" />
                <span className="font-medium text-sm">I have read and understand the CYT Fredericksburg Production Manual.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-1" />
                <span className="font-medium text-sm">I am committing to be present to rehearsals when I am called.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-1" />
                <span className="font-medium text-sm">I will not add conflicts after auditions (unless illness, family emergency, or graded school event).</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-1" />
                <span className="font-medium text-sm">Parent: I commit to serve on a pre-show and show committee, and understand I may be called upon to work during rehearsals even if my child is not called.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 mt-1" />
                <span className="font-medium text-sm">Parent: I am responsible for selling a minimum of 20 tickets or paying the balance at the close of the show.</span>
              </label>

              <div className="pt-6 mt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Parent/Adult Sponsor Name</label>
                    <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Digital Signature (Type Full Name)</label>
                    <input type="text" className="w-full bg-zinc-50 border border-zinc-300 rounded-lg p-3" placeholder="Sign here..." />
                 </div>
              </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="flex justify-end pb-12">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest px-8 py-4 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95">
            <CheckCircle2 size={24} /> Submit Audition Form
          </button>
        </div>

      </div>
    </div>
  );
}