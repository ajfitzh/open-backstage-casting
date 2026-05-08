/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Lock, Loader2, AlertCircle, Chrome } from 'lucide-react';

export default function LoginPage() {
  const params = useParams();
  const tenant = (params?.tenant as string) || "sandbox";
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Helper to format the tenant slug into a pretty name
  const formatTenantName = (slug: string) => {
      if (slug === 'cytfred') return "CYT Fredericksburg";
      if (slug === 'sandbox') return "Open Backstage";
      return slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  const orgName = formatTenantName(tenant);

  // 1. Handle Google Login
  const handleGoogleLogin = () => {
      setIsLoading(true);
      // "google" must match the provider ID in route.ts
      // 🟢 FIX: Send them to the root of the current subdomain
      signIn("google", { callbackUrl: `/` });
  };

  // 2. Handle Password Login
  const handleCredentialsLogin = async (e: FormEvent) => {
    e.preventDefault(); 
    setIsLoading(true); 
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false, // 🚨 FIX: Must be false to get the 'result' object back!
    });

    if (result?.error) {
      setError("Invalid credentials. Please check your email and password.");
      setIsLoading(false);
    } else {
      router.refresh(); 
      // 🟢 FIX: Send them to the root of the current subdomain
      router.push(`/`); 
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
        
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 mb-4">
            <Lock size={32} className="text-blue-500" />
        </div>
        
        <div className="space-y-1 mb-8">
            <h1 className="text-3xl font-black uppercase italic text-white tracking-tight">Portal Login</h1>
            {/* Elegant Organization Name display */}
            <p className="text-blue-400 font-bold tracking-widest uppercase text-xs">
                {orgName}
            </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium mb-6">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-4">
            {/* --- GOOGLE SSO BUTTON --- */}
            <button 
                onClick={handleGoogleLogin}
                type="button"
                disabled={isLoading}
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 active:scale-95 shadow-md"
            >
                <Chrome size={20} className="text-blue-600" />
                Sign in with Google
            </button>

            {/* Divider */}
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-3 text-zinc-500 font-bold tracking-widest">Or</span></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-3">
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !email || !password}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 shadow-lg mt-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Enter Dashboard"}
                </button>
            </form>

            {/* The Sign Up Link! */}
            <div className="mt-8 text-center border-t border-zinc-800 pt-6">
                <p className="text-zinc-500 text-sm mb-2">Don&apos;t have an account yet?</p>
                {/* 🟢 FIX: Clean relative path so it correctly resolves to e2e.localhost:3001/signup */}
                <a 
                    href="/signup" 
                    className="text-blue-500 hover:text-blue-400 font-bold text-sm transition-colors"
                >
                    Create a Free Account
                </a>
            </div>
        </div>
      </div>
    </div>
  );
}