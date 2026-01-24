"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Mic2, Layers, LogOut, HeartHandshake } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Auditions', href: '/auditions', icon: Mic2 },
  { name: 'Callbacks', href: '/callbacks', icon: Layers },
  { name: 'Casting', href: '/casting', icon: Users },
  { name: 'Conflicts', href: '/conflicts', icon: Calendar }, // Added this earlier
];

export default function CastingSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* DESKTOP: Use h-full, not h-screen */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-zinc-900 border-r border-white/5 h-full shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-black italic uppercase text-blue-500 hidden lg:block">Production Deck</h1>
          <h1 className="text-xl font-black italic uppercase text-blue-500 lg:hidden">PD</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={20} />
                <span className="font-bold hidden lg:block">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
           <Link href="/login" className="flex items-center gap-4 p-3 text-zinc-500 hover:text-red-400 transition-colors">
              <LogOut size={20} />
              <span className="font-bold hidden lg:block text-xs uppercase tracking-widest">Logout</span>
           </Link>
        </div>
      </aside>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-zinc-950 border-t border-white/10 z-[100] flex justify-around items-center px-2 pb-safe">
        {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-blue-500' : 'text-zinc-500'}`}
              >
                <div className={`p-1.5 rounded-full ${isActive ? 'bg-blue-500/20' : 'bg-transparent'}`}>
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wide">{item.name}</span>
              </Link>
            );
        })}
      </nav>
    </>
  );
}