// app/[tenant]/(main)/production/[id]/rehearsal-check-in/loading.tsx
import React from 'react';

export default function KioskLoadingSkeleton() {
    return (
        <div className="p-6 lg:p-8 min-h-screen bg-zinc-950 animate-pulse">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* KIOSK HEADER SKELETON */}
                <div className="bg-zinc-900 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/5">
                    <div className="w-full md:w-auto flex flex-col items-center md:items-start">
                        <div className="h-5 w-24 bg-zinc-800 rounded-full mb-4"></div>
                        <div className="h-10 w-64 bg-zinc-800 rounded-lg mb-3"></div>
                        <div className="h-5 w-48 bg-zinc-800 rounded-lg"></div>
                    </div>
                    <div className="w-full md:w-96 h-14 bg-zinc-800 rounded-2xl"></div>
                </div>

                {/* THE CAST GRID SKELETON */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                        <div key={i} className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg h-40">
                            <div className="flex items-center gap-3 mb-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-zinc-800 shrink-0"></div>
                                {/* Name and Role */}
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 w-3/4 bg-zinc-800 rounded"></div>
                                    <div className="h-3 w-1/2 bg-zinc-800 rounded"></div>
                                </div>
                            </div>
                            {/* Action Buttons Skeleton */}
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <div className="col-span-2 h-12 bg-zinc-800 rounded-xl"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}