"use client";
import { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, UserPlus, ArrowRight, PlayCircle, Star, MapPin, 
  X, Clock, AlertTriangle, CheckCircle2 
} from 'lucide-react';

export default function Home() {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-300">
      
      {/* NAVIGATION (unchanged) */}
      <nav className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="font-black text-2xl tracking-tight uppercase">
          CYT <span className="text-blue-600 dark:text-blue-500">Fredericksburg</span>
        </div>
        <button className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-300 transition-all">
          Family Login
        </button>
      </nav>

      {/* HERO SECTION */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-sm uppercase tracking-wide">
            <Star size={16} /> Summer 2026 Season
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
            Take the stage. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
              Into the Woods.
            </span>
          </h1>
        </div>

        {/* ACTIVE PRODUCTION CARD */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
          <div className="h-3 w-full bg-gradient-to-r from-blue-600 to-cyan-400"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12">
            
            <div className="space-y-6 flex flex-col justify-center">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2">Now Casting (Ages 13-20)</h3>
                <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">CYT+ Production</h2>
              </div>
              
              <p className="text-zinc-600 dark:text-zinc-300 text-lg leading-relaxed">
                This is a high-intensity, two-week rehearsal process. Students must arrive off-book and ready to work.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/sandbox/audition-form" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 group"
                >
                  <UserPlus size={20} />
                  Register
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                
                {/* 🟢 SCHEDULE BUTTON TRIGGER */}
                <button 
                  onClick={() => setIsScheduleOpen(true)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Calendar size={20} />
                  View Schedule
                </button>
              </div>
            </div>

            {/* QUICK INFO PANEL */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-700/50 space-y-6">
              <h4 className="font-bold text-xl border-b border-zinc-200 dark:border-zinc-700 pb-4">Production Details</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <Clock className="text-blue-600 mt-1" size={24} />
                  <div>
                    <strong className="block text-zinc-900 dark:text-white">Intensive Period</strong>
                    <span className="text-zinc-500 dark:text-zinc-400">July 6 – July 16 (9am-4pm Daily)</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin className="text-blue-600 mt-1" size={24} />
                  <div>
                    <strong className="block text-zinc-900 dark:text-white">Location</strong>
                    <span className="text-zinc-500 dark:text-zinc-400">Kingdom Baptist Church</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* 🟢 SCHEDULE MODAL */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setIsScheduleOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Production Schedule</h2>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Into the Woods | Summer 2026</p>
              </div>
              <button onClick={() => setIsScheduleOpen(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Content (Scrollable) */}
            <div className="overflow-y-auto p-6 space-y-8">
              
              {/* Attendance Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex gap-4">
                <AlertTriangle className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                  <strong>Attendance Policy:</strong> All rehearsals are mandatory. Unexcused absences may result in removal from scenes or the production.
                </p>
              </div>

              {/* Phase 1: Pre-Production */}
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-zinc-400">
                  <Star size={14} /> Pre-Production (Highly Encouraged)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                    <span className="block text-xs font-bold text-zinc-400">JUNE 11</span>
                    <p className="font-bold">Music Rehearsal</p>
                    <p className="text-sm text-zinc-500">10:00am - 1:00pm</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                    <span className="block text-xs font-bold text-zinc-400">JUNE 23</span>
                    <p className="font-bold">Music Rehearsal</p>
                    <p className="text-sm text-zinc-500">4:30pm - 8:00pm</p>
                  </div>
                </div>
              </section>

              {/* Phase 2: Intensives */}
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-zinc-400">
                  <Clock size={14} /> Intensive Rehearsal Weeks (Mandatory)
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                    <div>
                      <p className="font-bold">Week 1: July 6 - July 10</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">Daily Intensive + 2 Evening Work Nights</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">10am - 4pm</p>
                      <p className="text-xs text-blue-600 opacity-70">*Evening: 6pm-8pm</p>
                    </div>
                  </div>
                  <div className="flex justify-between p-4 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <div>
                      <p className="font-black">Super Saturday: July 11</p>
                      <p className="text-sm opacity-90 text-white">Full Cast @ Kingdom Baptist</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black italic">9am - 6pm</p>
                    </div>
                  </div>
                  <div className="flex justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                    <div>
                      <p className="font-bold">Week 2: July 13 - July 16</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">Split Shift: Daytime & Evening Tech</p>
                    </div>
                    <div className="text-right font-bold">
                      <p className="text-sm">10am-1pm</p>
                      <p className="text-sm">5pm-9pm</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Phase 3: Shows */}
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-zinc-400">
                  <CheckCircle2 size={14} /> Performances
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-tighter text-blue-600">Weekend 1</p>
                    <p className="text-sm"><strong>July 17:</strong> 7:00pm Show (5pm Call)</p>
                    <p className="text-sm"><strong>July 18:</strong> 2:00pm & 7:00pm (12pm Call)</p>
                  </div>
                  <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 sm:pl-6 pt-4 sm:pt-0">
                    <p className="text-xs font-black uppercase tracking-tighter text-blue-600">Weekend 2</p>
                    <p className="text-sm"><strong>July 23:</strong> 4pm-9pm (Tech Night)</p>
                    <p className="text-sm"><strong>July 24:</strong> 7:00pm Show (5pm Call)</p>
                    <p className="text-sm"><strong>July 25:</strong> 2:00pm & 7:00pm (12pm Call)</p>
                  </div>
                </div>
              </section>

            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button 
                onClick={() => setIsScheduleOpen(false)}
                className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2 rounded-lg font-bold text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}