import React from 'react';

export const OpenBackstageLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg 
    viewBox="0 0 512 512" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-label="Open Backstage Logo"
  >
    <rect width="512" height="512" rx="128" className="fill-zinc-950"/>
    
    <defs>
      <linearGradient id="showGradient" x1="156" y1="200" x2="356" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" className="stop-blue-400" stopColor="#60a5fa" />
        <stop offset="50%" className="stop-purple-400" stopColor="#c084fc" />
        <stop offset="100%" className="stop-emerald-400" stopColor="#34d399" />
      </linearGradient>
    </defs>

    {/* CYT Letters */}
    <path d="M165 140H125V180C125 195 135 205 150 205H165" stroke="white" strokeWidth="35" strokeLinecap="round"/>
    <path d="M256 205V140M220 140H292" stroke="white" strokeWidth="35" strokeLinecap="round"/>
    <path d="M347 140H387V140" stroke="white" strokeWidth="35" strokeLinecap="round"/>
    <path d="M367 140V205" stroke="white" strokeWidth="35" strokeLinecap="round"/>

    {/* Stage Arch */}
    <path d="M140 380V280C140 230 180 230 256 230C332 230 372 230 372 280V380" stroke="#27272a" strokeWidth="25" strokeLinecap="round"/>
    <rect x="120" y="380" width="272" height="20" rx="10" fill="#27272a"/>

    {/* Spotlight Beams */}
    <path d="M256 250 L200 380 H312 L256 250Z" fill="url(#showGradient)" opacity="0.9"/>
    <path d="M256 250 L160 380 H180 L256 250Z" fill="#60a5fa" opacity="0.4"/>
    <path d="M256 250 L352 380 H332 L256 250Z" fill="#34d399" opacity="0.4"/>
  </svg>
);