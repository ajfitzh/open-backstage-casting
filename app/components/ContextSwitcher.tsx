"use client";

import { useFormStatus } from 'react-dom';
import { Check, Sparkles } from 'lucide-react';
import { switchProduction } from '@/app/actions'; // Import the action we just made

// Define the shape of a Production based on your new Baserow setup
type Production = {
  id: number;
  title: string;
  branch: string; // 'Fredericksburg' | 'Stafford'
  type: string;   // 'Main Stage' | 'Lite'
};

export default function ContextSwitcher({ 
  shows, 
  activeId 
}: { 
  shows: Production[], 
  activeId: number 
}) {
  
  return (
    <div className="p-2 space-y-1">
      <div className="px-2 pt-2 pb-1 flex justify-between items-center">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          Switch Context
        </span>
      </div>
      
      {shows.map((prod) => {
        const isActive = activeId === prod.id;
        
        return (
          <form key={prod.id} action={switchProduction}>
            <input type="hidden" name="productionId" value={prod.id} />
            <SubmitButton prod={prod} isActive={isActive} />
          </form>
        );
      })}
    </div>
  );
}

// Small helper to handle the "Pending" state during the switch
function SubmitButton({ prod, isActive }: { prod: Production, isActive: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left group
        ${isActive ? 'bg-zinc-800/80 border border-zinc-700' : 'hover:bg-zinc-800 border border-transparent'}
        ${pending ? 'opacity-50 cursor-wait' : ''}
      `}
    >
      {/* Visual Indicator of Branch */}
      <div className={`h-8 w-1 rounded-full shrink-0 
        ${prod.branch === 'Stafford' ? 'bg-amber-500' : 'bg-emerald-500'}
      `} />
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
          {prod.title}
        </div>
        <div className="flex gap-2 text-[10px] uppercase font-bold text-zinc-600 group-hover:text-zinc-500">
          <span>{prod.branch}</span>
          <span>•</span>
          <span>{prod.type}</span>
        </div>
      </div>
      
      {isActive && <Check size={14} className="text-emerald-500" />}
      {pending && <Sparkles size={14} className="text-zinc-500 animate-spin" />}
    </button>
  );
}