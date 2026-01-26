import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6">
        
        {/* Spinning Icon */}
        <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
            <Loader2 size={48} className="text-blue-500 animate-spin relative z-10" />
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-black uppercase italic text-white tracking-widest animate-pulse">
            Loading Data
          </h2>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
            Syncing with Baserow...
          </p>
        </div>

      </div>
    </div>
  );
}