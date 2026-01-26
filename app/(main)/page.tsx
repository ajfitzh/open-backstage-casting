import { cookies } from 'next/headers';
import { getActiveProduction, getShowById, getAssignments } from '@/app/lib/baserow';
import Link from 'next/link';
import { 
  Users, Calendar, BarChart3, ClipboardCheck, Ticket, 
  ChevronRight, Sparkles, Fish, Cat, Dog, Music, 
  Theater, Book, Newspaper, Waves, Gavel, Snowflake, 
  Crown, Trees, Coffee, Bell, Stars, Paintbrush, Timer,
  Sun, CloudRain, Building2, Anchor, Heart,
  Baby, Bird, ScrollText
} from 'lucide-react';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  const show = activeId ? await getShowById(activeId) : await getActiveProduction();
  const assignments = await getAssignments(activeId);
  
  // Unique Cast Count (Heads, not Roles)
  const uniqueCastIds = new Set(
    assignments
      .filter((a: any) => a["Person"] && a["Person"].length > 0)
      .map((a: any) => a["Person"][0].id)
  );
  const castCount = uniqueCastIds.size;

  // --- 🎨 DYNAMIC THEME ENGINE ---
  const getShowTheme = (title: string) => {
    const t = title.toLowerCase();
    
    // 1. THE SAVANNAH (Lion King) - Warm Sunset Orange
    if (t.includes('lion')) 
        return { icon: <Cat size={220} />, color: 'text-orange-500', bg: 'from-orange-900/40 to-red-900/20', accent: 'text-orange-400' };

    // 2. THE JUNGLE (Shrek, Into the Woods, Jungle Book) - Deep Green
    if (t.includes('jungle') || t.includes('shrek') || t.includes('woods') || t.includes('tarzan')) 
        return { icon: <Trees size={220} />, color: 'text-emerald-600', bg: 'from-emerald-900/40 to-green-900/20', accent: 'text-emerald-400' };

    // 3. THE OCEAN (Mermaid, Moana, Big Fish) - Cyan/Teal
    if (t.includes('mermaid') || t.includes('fish') || t.includes('moana') || t.includes('waves')) 
        return { icon: <Waves size={220} />, color: 'text-cyan-500', bg: 'from-cyan-900/30 to-blue-900/20', accent: 'text-cyan-400' };

    // 4. WINTER & HOLIDAY (Frozen, Elf, Christmas) - Ice Blue
    if (t.includes('christmas') || t.includes('carol') || t.includes('frozen') || t.includes('winter') || t.includes('snow') || t.includes('elf')) 
        return { icon: <Snowflake size={220} />, color: 'text-sky-300', bg: 'from-sky-900/40 to-blue-900/30', accent: 'text-sky-200' };

    // 5. ROYALTY & FAIRYTALE (Cinderella, Beauty, Anastasia, Princess, Aladdin) - Royal Purple/Gold
    if (t.includes('beauty') || t.includes('cinderella') || t.includes('anastasia') || t.includes('princess') || t.includes('aladdin') || t.includes('royal')) 
        return { icon: <Crown size={220} />, color: 'text-purple-400', bg: 'from-purple-900/40 to-fuchsia-900/20', accent: 'text-amber-400' };

    // 6. WHIMSICAL & CANDY (Wonka, Seussical, Matilda, Alice) - Pink/Magenta
    if (t.includes('wonka') || t.includes('seussical') || t.includes('matilda') || t.includes('alice') || t.includes('wonderland') || t.includes('freaky')) 
        return { icon: <Sparkles size={220} />, color: 'text-pink-500', bg: 'from-pink-900/30 to-rose-900/20', accent: 'text-pink-400' };

    // 7. URBAN & INDUSTRIAL (Newsies, Annie, Oliver, 12 Angry Men, Guys and Dolls) - Grayscale/Zinc
    if (t.includes('newsies') || t.includes('newspaper') || t.includes('annie') || t.includes('oliver') || t.includes('angry') || t.includes('guys') || t.includes('take it with you')) 
        return { icon: <Newspaper size={220} />, color: 'text-zinc-400', bg: 'from-zinc-800/40 to-zinc-900', accent: 'text-zinc-200' };

    // 8. AMERICANA & RUSTIC (Oklahoma, Tom Sawyer, Music Man, Fiddler, Tuck, Charlotte) - Amber/Brown
    if (t.includes('oklahoma') || t.includes('sawyer') || t.includes('music man') || t.includes('fiddler') || t.includes('tuck') || t.includes('charlotte') || t.includes('green gables') || t.includes('little women')) 
        return { icon: <Sun size={220} />, color: 'text-amber-600', bg: 'from-amber-900/30 to-orange-900/20', accent: 'text-amber-500' };

    // 9. ANIMALS/PETS (Dalmatians, Charlie Brown, Honk, Doolittle) - Spotted/Playful
    if (t.includes('dalmatians') || t.includes('charlie brown') || t.includes('honk') || t.includes('doolittle') || t.includes('peach')) 
        return { icon: <Dog size={220} />, color: 'text-stone-300', bg: 'from-stone-800/40 to-red-900/10', accent: 'text-red-400' };

    // 10. NIGHT & DREAMS (Starry Night, Almost Maine, Joseph) - Indigo/Deep Blue
    if (t.includes('starry') || t.includes('maine') || t.includes('joseph') || t.includes('dream')) 
        return { icon: <Stars size={220} />, color: 'text-indigo-400', bg: 'from-indigo-900/50 to-blue-950', accent: 'text-yellow-200' };

    // 11. EMERALD CITY (Wizard of Oz) - Bright Green (Distinct from Jungle)
    if (t.includes('wizard') || t.includes('oz') || t.includes('wicked')) 
        return { icon: <Building2 size={220} />, color: 'text-green-500', bg: 'from-green-900/40 to-emerald-900/20', accent: 'text-green-400' };

    // 12. HIGH SCHOOL / TEEN (High School Musical, Footloose, Bye Bye Birdie) - Red/School Colors
    if (t.includes('high school') || t.includes('footloose') || t.includes('birdie')) 
        return { icon: <Music size={220} />, color: 'text-red-600', bg: 'from-red-900/30 to-white/5', accent: 'text-red-500' };

    // 13. SPECIALTY (Rain, Gavel, Coffee, etc)
    if (t.includes('rain')) return { icon: <CloudRain size={220} />, color: 'text-blue-400', bg: 'from-blue-900/30 to-slate-900', accent: 'text-yellow-400' };
    if (t.includes('gavel') || t.includes('legal')) return { icon: <Gavel size={220} />, color: 'text-stone-500', bg: 'from-stone-800 to-black', accent: 'text-stone-300' };
    if (t.includes('bucks') || t.includes('coffee')) return { icon: <Coffee size={220} />, color: 'text-amber-700', bg: 'from-amber-950 to-black', accent: 'text-green-500' };
    if (t.includes('hunchback')) return { icon: <Bell size={220} />, color: 'text-violet-900', bg: 'from-violet-950 to-black', accent: 'text-amber-500' };

    // Fallback: Generic Theater
    return { icon: <Theater size={220} />, color: 'text-blue-500', bg: 'from-zinc-900 to-zinc-900', accent: 'text-blue-500' };
  };

  const theme = getShowTheme(show?.Title || "");

  return (
    <div className="min-h-screen bg-zinc-950 p-6 pb-20 overflow-y-auto custom-scrollbar">
      
      {/* 1. DYNAMIC HERO SECTION */}
      <div className={`relative overflow-hidden bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-8 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${theme.bg}`}>
        
        {/* LARGE THEME ICON */}
        <div className={`absolute -top-12 -right-12 p-8 opacity-10 rotate-12 transition-all duration-1000 ${theme.color}`}>
            {theme.icon}
        </div>
        
        <div className="relative z-10 max-w-2xl">
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] mb-3 block transition-colors duration-1000 ${theme.accent}`}>
                Current Production
            </span>
            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white mb-6 drop-shadow-2xl">
                {show?.Title || "Select Production"}
            </h1>
            
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
                    <Users size={18} className="text-zinc-400"/>
                    <span className="text-sm font-black text-white">{castCount} Students Cast</span>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg">
                    <Ticket size={18} className={theme.accent}/>
                    <span className={`text-sm font-black ${theme.accent}`}>Box Office Active</span>
                </div>
            </div>
        </div>
      </div>

      {/* 2. THE ACTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Daily Operations */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-700" /> Daily Workspace
            </h3>
            <ActionCard 
                href="/schedule"
                title="Rehearsal Schedule"
                desc="View and create calls, times, and conflicts"
                icon={<Calendar className="text-blue-400"/>}
                color="bg-blue-400"
            />
            <ActionCard 
                href="/education"
                title="Class Attendance"
                desc="Weekly attendance status and entry"
                icon={<ClipboardCheck className="text-emerald-400"/>}
                color="bg-emerald-400"
            />
        </div>

        {/* Company Management */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-700" /> People & Teams
            </h3>
            <ActionCard 
                href="/committees"
                title="Volunteer Committees"
                desc="Manage parent assignments & roles, track committee progress"
                icon={<Users className="text-purple-400"/>}
                color="bg-purple-400"
            />
            <ActionCard 
                href="/roster"
                title="The Master Roster"
                desc="Contact info, compliance and status tracker"
                icon={<Users className="text-amber-400"/>}
                color="bg-amber-400"
            />
        </div>

        {/* Analytics */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-700" /> Production Health
            </h3>
            <ActionCard 
                href="/reports"
                title="Director Reports"
                desc="Revenue, Cast breakdown, show health metrics"
                icon={<BarChart3 className="text-pink-400"/>}
                color="bg-pink-400"
            />
            <div className="p-8 rounded-3xl border border-dashed border-zinc-800/50 flex flex-col items-center justify-center text-center group transition-all hover:bg-zinc-900/30">
                <Sparkles size={24} className="text-zinc-800 group-hover:text-blue-500/50 transition-all duration-500 mb-2"/>
                <span className="text-[10px] font-black uppercase text-zinc-700 tracking-tighter">Script & Score Hub</span>
                <span className="text-[8px] text-zinc-800 uppercase font-black tracking-widest mt-1">v2.0 Pipeline</span>
            </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-24 pt-10 border-t border-white/5 flex flex-col items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">Open Backstage Casting</div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] text-zinc-500 font-black uppercase tracking-widest">Build 1.1.2</div>
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] text-blue-500 font-black uppercase tracking-widest">Active Server</div>
          </div>
      </div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon, color }: any) {
    return (
        <Link href={href} className="group relative block bg-zinc-900/50 border border-white/5 p-6 rounded-3xl hover:bg-zinc-900 hover:border-white/10 transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-sm">
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500 ${color}`} />
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 group-hover:scale-110 group-hover:bg-black/60 transition-all duration-500">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-base group-hover:text-white transition-colors tracking-tight">{title}</h4>
                    <p className="text-xs text-zinc-500 font-medium line-clamp-1">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-zinc-800 group-hover:text-white transition-all transform group-hover:translate-x-1" />
            </div>
        </Link>
    )
}