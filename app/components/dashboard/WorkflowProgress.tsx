"use client";

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Mic2, Users, SlidersHorizontal, Calendar, Megaphone } from 'lucide-react';

export default function WorkflowProgress({ status }: any) {
  
  const steps = [
    {
      id: 'auditions',
      label: 'Auditions',
      desc: 'Log auditionees',
      link: '/auditions',
      icon: <Mic2 size={16} />,
      isComplete: status.hasAuditions,
    },
    {
      id: 'callbacks',
      label: 'Callbacks',
      desc: 'Review talent',
      link: '/callbacks',
      icon: <Megaphone size={16} />,
      isComplete: status.hasCallbacks, // New Status Logic
    },
    {
      id: 'casting',
      label: 'Casting',
      desc: 'Assign roles',
      link: '/casting',
      icon: <Users size={16} />,
      isComplete: status.hasCast,
    },
    {
      id: 'points',
      label: 'Calibration',
      desc: 'Set difficulty',
      link: '/analysis',
      icon: <SlidersHorizontal size={16} />,
      isComplete: status.hasPoints,
    },
    {
      id: 'schedule',
      label: 'Scheduling',
      desc: 'First rehearsal',
      link: '/schedule',
      icon: <Calendar size={16} />,
      isComplete: status.hasSchedule,
    }
  ];

  // Calculate overall progress
  const completedCount = steps.filter(s => s.isComplete).length;
  const progressPercent = (completedCount / steps.length) * 100;
  
  // Find current phase
  const currentStep = steps.find(s => !s.isComplete) || { label: "Production Active" };

  return (
    <div className="w-full bg-zinc-900 border border-white/10 rounded-xl p-6 mb-8">
      <div className="flex justify-between items-end mb-6">
        <div>
            <h2 className="text-lg font-black uppercase text-white tracking-wide">Production Roadmap</h2>
            <p className="text-zinc-400 text-sm mt-1">Current Phase: <span className="text-blue-400 font-bold">{currentStep.label}</span></p>
        </div>
        <div className="text-right">
            <div className="text-2xl font-black text-white">{Math.round(progressPercent)}%</div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Setup Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-zinc-800 rounded-full mb-8 overflow-hidden">
         <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 relative">
         {/* Connector Line (Desktop Only) */}
         <div className="hidden md:block absolute top-6 left-10 right-10 h-0.5 bg-zinc-800 -z-10" />

         {steps.map((step, i) => {
            const isNext = !step.isComplete && (i === 0 || steps[i-1].isComplete);
            
            return (
                <Link 
                    key={step.id} 
                    href={step.link}
                    className={`group relative flex flex-col items-center text-center p-3 md:p-4 rounded-xl transition-all border ${
                        isNext 
                        ? 'bg-blue-600/10 border-blue-500/50 hover:bg-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                    {/* Icon Bubble */}
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                        step.isComplete ? 'bg-emerald-500 text-white' : 
                        isNext ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                        {step.isComplete ? <CheckCircle2 size={20} /> : step.icon}
                    </div>

                    <h3 className={`text-xs md:text-sm font-bold ${step.isComplete ? 'text-zinc-400' : 'text-white'}`}>{step.label}</h3>
                    <p className="hidden md:block text-xs text-zinc-500 mt-1">{step.desc}</p>

                    {isNext && (
                        <div className="absolute -bottom-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
                            Next <ArrowRight size={10} />
                        </div>
                    )}
                </Link>
            )
         })}
      </div>
    </div>
  );
}