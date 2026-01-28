"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Lock, Loader2, AlertCircle, Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // 1. Handle Google Login
  const handleGoogleLogin = () => {
      setIsLoading(true);
      // "google" must match the provider ID in route.ts
      signIn("google", { callbackUrl: "/" });
  };

  // 2. Handle Password Login
  const handleCredentialsLogin = async (e: FormEvent) => {
    e.preventDefault(); 
    setIsLoading(true); 
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials.");
      setIsLoading(false);
    } else {
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
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-4">
            
            {/* --- NEW: GOOGLE SSO BUTTON --- */}
            <button 
                onClick={handleGoogleLogin}
                type="button"
                disabled={isLoading}
                className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3"
            >
                <Chrome size={20} className="text-blue-600" />
                Sign in with Google
            </button>

            {/* Divider */}
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">Or use password</span></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-3">
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-center focus:border-blue-500 outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                />
                <input 
                    type="password" 
                    placeholder="App Password" 
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-center focus:border-blue-500 outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !email || !password}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Enter Deck"}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}