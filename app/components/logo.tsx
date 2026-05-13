import React from 'react';

interface LogoProps {
  tenantSlug?: string;
  className?: string;
  collapsed?: boolean;
}

export default function Logo({ tenantSlug, className = "", collapsed = false }: LogoProps) {
  const isCYT = tenantSlug?.toLowerCase().includes('cyt');
  
  // Dynamic Tenant Naming
  const getTenantName = (slug?: string) => {
    if (!slug || slug === 'default') return null;
    if (slug.includes('cytfred')) return 'CYT FREDERICKSBURG';
    if (isCYT) return 'CYT';
    return slug.toUpperCase();
  };

  const tenantName = getTenantName(tenantSlug);

  // 🟢 Dynamic Branding Colors! 
  // If it's a CYT tenant, use their official Cyan and Yellow hex codes.
  // Otherwise, fallback to the default Open Backstage Blue/Purple.
  const curtainColor = isCYT ? 'text-[#2bc0ea]' : 'text-blue-500';
  const starColor = isCYT ? 'text-[#f6f17d]' : 'text-purple-400';
  const glowContainer = isCYT ? 'bg-[#2bc0ea]/10 border-[#2bc0ea]/20' : 'bg-blue-500/10 border-blue-500/20';

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl border shadow-inner ${glowContainer} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" fill="currentColor">
            {/* Left Curtain */}
            <path d="M3 2h5c0 7.5-3 12-4 20H3V2z" className={curtainColor} />
            {/* Right Curtain */}
            <path d="M21 2h-5c0 7.5 3 12 4 20h1V2z" className={curtainColor} />
            {/* Center Star */}
            <path d="M12 6l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" className={starColor} />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex flex-col justify-center ${className}`}>
      {/* Dynamic Tenant Badge */}
      {tenantName && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em]">
            {tenantName}
          </span>
        </div>
      )}

      {/* Main Open Backstage Wordmark & Icon */}
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" fill="currentColor">
            {/* Left Curtain */}
            <path d="M2 2h6c0 7.5-3.5 12-4.5 20H2V2z" className={curtainColor} />
            {/* Right Curtain */}
            <path d="M22 2h-6c0 7.5 3.5 12 4.5 20h1.5V2z" className={curtainColor} />
            {/* Center Star */}
            <path d="M12 5l1.2 3.8 3.8 1.2-3.8 1.2L12 15l-1.2-3.8-3.8-1.2 3.8-1.2L12 5z" className={starColor} />
            {/* Stage Floor */}
            <rect x="2" y="22" width="20" height="2" rx="1" className="text-zinc-300 dark:text-zinc-700" />
        </svg>
        <h1 className="text-lg font-black tracking-tighter leading-none">
          <span className={curtainColor}>OPEN</span>
          <span className="text-zinc-900 dark:text-zinc-100 ml-0.5">BACKSTAGE</span>
        </h1>
      </div>
    </div>
  );
}