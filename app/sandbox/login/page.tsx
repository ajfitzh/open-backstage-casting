'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SandboxLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, you'd call a Server Action to set a secure cookie.
    // For a quick sandbox, we can just set it via document.cookie:
    document.cookie = `sandbox_access=${password}; path=/; max-age=86400; SameSite=Strict`;
    
    // Refresh to let middleware re-check
    window.location.href = '/sandbox';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tighter italic">CYT SANDBOX</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Volunteer Check-In Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Enter Desk Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-white text-center focus:ring-2 ring-indigo-500 outline-none transition-all"
          />
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20">
            Open Desk
          </button>
        </form>
      </div>
    </div>
  );
}