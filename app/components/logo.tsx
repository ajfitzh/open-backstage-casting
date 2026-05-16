import React from 'react';

interface LogoProps {
  tenantSlug?: string;
  className?: string;
  collapsed?: boolean;
}

export default function Logo({ tenantSlug, className = "", collapsed = false }: LogoProps) {
  const isCYT = tenantSlug?.toLowerCase().includes('cyt');
  
  // Dynamic Tenant Naming (Splitting into two parts for two-tone coloring)
  const getTenantName = (slug?: string) => {
    if (!slug || slug === 'default') return null;
    if (slug.includes('cytfred')) return ['CYT', 'FREDERICKSBURG'];
    if (isCYT) return ['CYT', 'THEATER'];
    return [slug.toUpperCase(), ''];
  };

  const tenantNameParts = getTenantName(tenantSlug);

  // 🟢 Dynamic Branding Colors
  const curtainColor = isCYT ? 'text-[#2bc0ea]' : 'text-blue-500';
  const starColor = isCYT ? 'text-[#f6f17d]' : 'text-purple-400';
  const glowContainer = isCYT ? 'bg-[#2bc0ea]/10 border-[#2bc0ea]/20' : 'bg-blue-500/10 border-blue-500/20';

  // 🟢 Dynamic Sub-Icons (Rendered between the curtains!)
  const renderTenantSubIcon = () => {
    if (tenantSlug?.includes('cytfred')) {
      // Custom CYT Fred Emblem (A 5-point star with an 'F' cut out of the center)
      return (
        <g className={starColor}>
          <path d="M12 3l2.3 6.8h7.2l-5.8 4.3 2.2 7-5.9-4.5-5.9 4.5 2.2-7-5.8-4.3h7.2z" />
          <path d="M10.5 9h3v1.5h-1.5v1h1.5v1.5h-1.5v2h-1.5z" fill="#18181b" className="dark:fill-zinc-950 fill-white" />
        </g>
      );
    }
    if (isCYT) {
      // Standard CYT 5-point Star
      return <path d="M12 3l2.3 6.8h7.2l-5.8 4.3 2.2 7-5.9-4.5-5.9 4.5 2.2-7-5.8-4.3h7.2z" className={starColor} />;
    }
    // Default Open Backstage 4-point star
    return <path d="M12 5l1.2 3.8 3.8 1.2-3.8 1.2L12 15l-1.2-3.8-3.8-1.2 3.8-1.2L12 5z" className={starColor} />;
  };

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl border shadow-inner ${glowContainer} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" fill="currentColor">
            {/* Left Curtain */}
            <path d="M3 2h5c0 7.5-3 12-4 20H3V2z" className={curtainColor} />
            {/* Right Curtain */}
            <path d="M21 2h-5c0 7.5 3 12 4 20h1V2z" className={curtainColor} />
            {renderTenantSubIcon()}
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex flex-col justify-center ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className={`absolute inset-0 blur-md rounded-full ${glowContainer}`} />
          <svg viewBox="0 0 24 24" className="w-8 h-8 shrink-0 relative z-10" fill="currentColor">
              {/* Left Curtain */}
              <path d="M2 2h6c0 7.5-3.5 12-4.5 20H2V2z" className={curtainColor} />
              {/* Right Curtain */}
              <path d="M22 2h-6c0 7.5 3.5 12 4.5 20h1.5V2z" className={curtainColor} />
              {renderTenantSubIcon()}
              {/* Stage Floor */}
              <rect x="2" y="22" width="20" height="2" rx="1" className="text-zinc-300 dark:text-zinc-700" />
          </svg>
        </div>
        
        <div className="flex flex-col">
          {/* White-labeled Wordmark */}
          {tenantNameParts ? (
            <>
              <h1 className="text-xl font-black tracking-tighter leading-none uppercase">
                <span className={curtainColor}>{tenantNameParts[0]}</span>
                <span className="text-zinc-900 dark:text-zinc-100 ml-1.5">{tenantNameParts[1]}</span>
              </h1>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Powered by Open Backstage
              </span>
            </>
          ) : (
            <h1 className="text-xl font-black tracking-tighter leading-none uppercase">
              <span className={curtainColor}>OPEN</span>
              <span className="text-zinc-900 dark:text-zinc-100 ml-1.5">BACKSTAGE</span>
            </h1>
          )}
        </div>
      </div>
    </div>
  );
}