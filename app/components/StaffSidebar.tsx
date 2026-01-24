"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HeartHandshake, 
  ClipboardCheck, 
  LayoutDashboard, 
  Users 
} from 'lucide-react';

const STAFF_NAV_ITEMS = [
  { 
    name: 'Compliance', 
    href: '/compliance', // Changed from attendance to reflect the 'checkmarks' dashboard
    icon: ClipboardCheck 
  },
  { 
    name: 'Committees', 
    href: '/committees', 
    icon: HeartHandshake 
  },
  { 
    name: 'Production Reports', 
    href: '/reports', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Cast List', 
    href: '/cast', 
    icon: Users 
  },
];

export default function StaffSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-zinc-950 border-r border-zinc-800 h-screen shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3">
          {/* Using a subtle emerald accent for the branding */}
          <div className="h-8 w-1 bg-emerald-500 rounded-full" />
          <h1 className="text-xl font-black italic uppercase text-zinc-100 hidden lg:block tracking-tighter">
            Staff <span className="text-emerald-500">Deck</span>
          </h1>
          <h1 className="text-xl font-black italic uppercase text-emerald-500 lg:hidden">
            SD
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {STAFF_NAV_ITEMS.map((item) => {
          // Strict matching for home, startsWith for sub-pages
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' 
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <item.icon 
                size={20} 
                className={isActive ? 'text-white' : 'group-hover:text-emerald-400 transition-colors'} 
              />
              <span className="font-bold hidden lg:block">{item.name}</span>
              
              {/* Tooltip-ish indicator for collapsed view */}
              {isActive && (
                <div className="lg:hidden absolute left-0 w-1 h-6 bg-white rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer info - useful for theater staff during a run */}
      <div className="p-4 border-t border-zinc-900 hidden lg:block">
        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Active Show</p>
          <p className="text-sm font-medium text-zinc-300 truncate">White Christmas</p>
        </div>
      </div>
    </aside>
  );
}