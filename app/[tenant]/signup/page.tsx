"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/app/actions/auth';
import { UserPlus, ArrowRight, AlertTriangle } from 'lucide-react';

export default function SignUpPage({ params }: { params: { tenant: string } }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError("All fields are required.");
            setIsLoading(false);
            return;
        }

        const res = await registerUser(params.tenant, formData);

        if (res.success) {
            setSuccess(true);
            // Give them a second to see the success message, then bounce them to login
            setTimeout(() => {
                router.push(`/${params.tenant}/login`);
            }, 2000);
        } else {
            setError(res.error || "Failed to sign up.");
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-2xl text-center max-w-md w-full animate-in zoom-in-95">
                    <h2 className="text-2xl font-black text-emerald-500 mb-2">Account Created!</h2>
                    <p className="text-zinc-400">Redirecting you to the login screen...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Join the Cast</h1>
                    <p className="text-zinc-400 mt-2">Create your Open Backstage account</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-2 text-sm font-medium mb-6">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                            type="text" 
                            placeholder="First Name" 
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-all"
                        />
                        <input 
                            type="text" 
                            placeholder="Last Name" 
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-all"
                        />
                    </div>
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-all"
                    />
                    <input 
                        type="password" 
                        placeholder="Create a Password" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-all"
                    />

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
                    >
                        {isLoading ? "Creating Account..." : "Sign Up"} <UserPlus size={18} />
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button 
                        onClick={() => router.push(`/${params.tenant}/login`)}
                        className="text-zinc-500 hover:text-white text-sm font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                        Already have an account? Sign in <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}