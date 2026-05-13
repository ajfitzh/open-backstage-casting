// app/components/logo.tsx
import React from 'react';

interface LogoProps {
  tenantSlug?: string;
  className?: string;
  collapsed?: boolean;
}

export default function Logo({ tenantSlug, className = "", collapsed = false }: LogoProps) {
  // Map the URL slug to the official organization name
  const getTenantName = (slug?: string) => {
    if (!slug || slug === 'default') return null;
    if (slug.includes('cytfred')) return 'CYT FREDERICKSBURG';
    if (slug.includes('cyt')) return 'CYT';
    return slug.toUpperCase();
  };

  const tenantName = getTenantName(tenantSlug);

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500 shadow-inner ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M2 10h20" />
          <path d="M12 2v20" />
          <path d="m4.93 4.93 14.14 14.14" />
          <path d="m19.07 4.93-14.14 14.14" />
          <circle cx="12" cy="12" r="3" className="fill-blue-500/20" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex flex-col justify-center ${className}`}>
      {/* Optional Tenant Badge (e.g., CYT FREDERICKSBURG) */}
      {tenantName && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em]">
            {tenantName}
          </span>
        </div>
      )}

      {/* Main OpenBackstage Wordmark */}
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-blue-500 shrink-0">
            {/* Stylized Stage/Spotlight Icon */}
            <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="fill-blue-500/10"/>
            <path d="M12 10L6 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 10L18 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="10" r="2" fill="currentColor" />
        </svg>
        <h1 className="text-lg font-black tracking-tighter leading-none">
          <span className="text-blue-500">OPEN</span>
          <span className="text-zinc-100">BACKSTAGE</span>
        </h1>
      </div>
    </div>
  );
}