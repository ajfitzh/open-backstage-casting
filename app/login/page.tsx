"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    // We set a cookie manually for simplicity
    // In a real production app with thousands of users, use NextAuth. 
    // For a theatre team of 5, this is totally fine.
    document.cookie = `cyt_auth=${password}; path=/; max-age=86400;`; // 1 day expiry
    router.push('/');
    router.refresh();
  };

  return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-2xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
            <Lock size={32} className="text-blue-500" />
        </div>
        <h1 className="text-2xl font-black uppercase italic text-white tracking-tight">Staff Access</h1>
        <input 
            type="password" 
            placeholder="Enter Access Code..." 
            className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-center focus:border-blue-500 outline-none text-lg tracking-widest placeholder:text-zinc-600"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="w-full bg-white text-black font-black uppercase py-4 rounded-xl hover:bg-zinc-200 transition-colors">
            Enter Deck
        </button>
      </div>
    </div>
  );
}