"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [digitalId, setDigitalId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); 
    if (!email || !digitalId) return; 

    setIsLoading(true); 
    setError('');

    // 1. Call NextAuth
    const result = await signIn('credentials', {
      email: email,
      digitalId: digitalId,
      redirect: false, // We handle the redirect manually for a smoother UX
    });

    if (result?.error) {
      setError("Invalid Email or Digital ID");
      setIsLoading(false);
    } else {
      // 2. Success! 
      // We refresh the router so Server Components re-fetch the new Session
      router.refresh(); 
      router.push('/'); 
    }
  };

  return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-2xl shadow-2xl text-center space-y-6">
        
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
            <Lock size={32} className="text-blue-500" />
        </div>
        
        <h1 className="text-2xl font-black uppercase italic text-white tracking-tight">Casting Portal</h1>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-center focus:border-blue-500 outline-none text-lg tracking-wide placeholder:text-zinc-600 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
            />

            {/* Digital ID (Password) Input */}
            <input 
                type="password" 
                autoComplete="current-password"
                placeholder="Digital ID" 
                className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-center focus:border-blue-500 outline-none text-lg tracking-widest placeholder:text-zinc-600 transition-all"
                value={digitalId}
                onChange={(e) => setDigitalId(e.target.value)}
                disabled={isLoading}
                required
            />
            
            <button 
                type="submit" 
                disabled={isLoading || !email || !digitalId}
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