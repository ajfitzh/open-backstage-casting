"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Rocket,           // Launch
  Mic2,             // Auditions
  Users,            // Callbacks
  ClipboardList,    // Casting
  Wrench,           // Diagnostics
  ChevronLeft, 
  ChevronRight
} from "lucide-react";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true); 
  const pathname = usePathname();

  const navItems = [
    { name: "Launch", href: "/", icon: <Rocket size={20} /> },
    { name: "Auditions", href: "/auditions", icon: <Mic2 size={20} /> },
    { name: "Callbacks", href: "/callbacks", icon: <Users size={20} /> },
    { name: "Casting", href: "/casting", icon: <ClipboardList size={20} /> },
    { name: "Diagnostics", href: "/diagnostics", icon: <Wrench size={20} /> },
  ];

  return (
    <aside 
        className={`bg-zinc-950 border-r border-white/5 flex flex-col transition-all duration-300 z-50
            ${isCollapsed ? "w-[60px]" : "w-64"}
        `}
    >
      {/* HEADER / LOGO */}
      <div className="h-14 flex items-center justify-center border-b border-white/5 relative">
        <div className={`font-black italic text-white transition-all overflow-hidden whitespace-nowrap duration-300
            ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto text-lg"}
        `}>
           OPEN BACKSTAGE
        </div>
        {isCollapsed && <span className="font-bold text-xs text-zinc-500">OB</span>}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 flex flex-col gap-2 p-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group relative
                ${isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }
                ${isCollapsed ? "justify-center" : ""}
              `}
            >
              <span className={`shrink-0 ${isActive ? "text-white" : "group-hover:text-white"}`}>
                {item.icon}
              </span>
              
              {/* LABEL (Visible when Expanded) */}
              <span 
                className={`text-sm font-bold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300
                    ${isCollapsed ? "w-0 opacity-0 absolute" : "w-auto opacity-100 relative"}
                `}
              >
                {item.name}
              </span>

              {/* TOOLTIP (Only Visible when Collapsed + Hovered) */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 border border-white/10 text-white text-xs font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* TOGGLE BUTTON */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="h-12 border-t border-white/5 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-zinc-900 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={16} /> : (
            <div className="flex items-center gap-2 text-xs font-bold uppercase">
                <ChevronLeft size={16} /> Collapse
            </div>
        )}
      </button>

    </aside>
  );
}