"use client";

import React, { useState } from 'react';
import ProductionTracker from './ProductionTracker';
import ProductionOverview from './ProductionOverview';
import { LayoutDashboard, BarChart2 } from 'lucide-react';

interface Props {
  scenes: any[];
  demographics: any[];
}

export default function DashboardClient({ scenes, demographics }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tracker'>('tracker');

  return (
    <div className="space-y-8">
      
      {/* 🟢 TABS HEADER */}
      <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-white/10 w-fit">
        <button 
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'tracker' ? 'bg-zinc-800 text-white shadow-sm border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            <LayoutDashboard size={16} />
            Tracker
        </button>
        <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'overview' ? 'bg-zinc-800 text-white shadow-sm border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            <BarChart2 size={16} />
            Overview
        </button>
      </div>

      {/* 🟢 CONTENT SWITCHER */}
      <div>
        {activeTab === 'tracker' ? (
            <ProductionTracker scenes={scenes} />
        ) : (
            <ProductionOverview demographics={demographics} />
        )}
      </div>

    </div>
  );
}