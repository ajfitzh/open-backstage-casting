"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeartHandshake, FileText, ClipboardList } from 'lucide-react'; // Make sure you have these icons or swap them

const STAFF_NAV_ITEMS = [
  { name: 'Committees', href: '/committees', icon: HeartHandshake },
  { name: 'Attendance', href: '/attendance', icon: ClipboardList },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export default function StaffSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-zinc-900 border-r border-white/5 h-screen shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-black italic uppercase text-emerald-500 hidden lg:block">Staff Deck</h1>
        <h1 className="text-xl font-black italic uppercase text-emerald-500 lg:hidden">SD</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {STAFF_NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span className="font-bold hidden lg:block">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}