"use client";
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function onDismiss() {
    router.back(); // This closes the modal by going back in history
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onDismiss} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 custom-scrollbar">
        <button 
          onClick={onDismiss} 
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}