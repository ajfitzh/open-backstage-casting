"use client";
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New: Visual feedback
  const router = useRouter();

const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); 
    if (!password) return; 

    setIsLoading(true); 

    // 1. Set the cookie
    document.cookie = `cyt_auth=${password}; path=/; max-age=86400;`; 
    
    // 2. THE NUCLEAR OPTION
    // Instead of router.push('/'), use this:
    window.location.href = '/'; 
  };

  return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-2xl shadow-2xl text-center space-y-6">
        
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
            <Lock size={32} className="text-blue-500" />
        </div>
        
        <h1 className="text-2xl font-black uppercase italic text-white tracking-tight">Staff Access</h1>
        
        {/* NEW: Wrapping in a form makes 'Enter' key work automatically */}
        <form onSubmit={handleLogin} className="space-y-4">
            <input 
                type="passcode" 
                autoComplete="one-time-code"
                placeholder="Enter Access Code..." 
                className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-center focus:border-blue-500 outline-none text-lg tracking-widest placeholder:text-zinc-600 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading} // Prevent double-clicks
            />
            
            <button 
                type="submit" 
                disabled={isLoading || !password}
                className="w-full bg-white text-black font-black uppercase py-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Verifying...
                    </>
                ) : (
                    "Enter Deck"
                )}
            </button>
        </form>

      </div>
    </div>
  );
}