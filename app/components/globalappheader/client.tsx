"use client";

import { handleLogout } from '@/app/lib/actions';
import { useState, useRef, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { switchProductionDirect } from '@/app/actions';
import { useSimulation } from '@/app/context/SimulationContext';
import { hasPermission } from '@/app/lib/permissions';
import { NAV_CONFIG } from '@/app/lib/nav-config';
import {
  classifyShowBucket,
  filterShowsByQuery,
  type SwitcherShow,
} from '@/app/lib/show-switcher-helpers';
import {
  Menu,
  X,
  ChevronRight,
  ChevronsUpDown,
  Calendar,
  Clock,
  Rocket,
  Bug,
  Wrench,
  Settings,
  LogOut,
  Search,
  History,
  RotateCcw,
  Loader2,
  Check,
} from 'lucide-react';

export default function GlobalHeaderClient({
  tenant: tenantProp,
  shows,
  activeId,
  defaultActiveShowId,
  user,
}: {
  tenant?: string;
  shows: SwitcherShow[];
  activeId: number;
  defaultActiveShowId?: number;
  user?: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tenant = tenantProp || (params?.tenant as string) || '';

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const { role: effectiveRole, productionRole, isSimulating } = useSimulation();

  const navRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cleanPathname = pathname.replace(/^\/[^/]+/, '') || '/';

  // URL param takes precedence over cookie so header always matches the current route
  const urlId = params?.id ? parseInt(String(params.id), 10) : NaN;
  const resolvedShowId =
    Number.isInteger(urlId) && urlId > 0 && shows.some((s) => s.id === urlId)
      ? urlId
      : activeId || shows[0]?.id || 0;

  const activeShow =
    shows.find((s) => s.id === resolvedShowId) ||
    shows[0] || { id: 0, title: 'Select Production', location: 'Unknown', status: '' };

  const activeBucket = classifyShowBucket(activeShow);
  const isViewingHistorical = activeBucket === 'archive';
  const defaultActiveShow =
    shows.find((s) => s.id === defaultActiveShowId) ||
    shows.find((s) => classifyShowBucket(s) === 'active') ||
    null;

  const [viewMode, setViewMode] = useState<'current' | 'archive'>(
    isViewingHistorical ? 'archive' : 'current'
  );

  // Close menus on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setIsNavOpen(false);
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) setIsContextOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsContextOpen(false);
        setIsProfileOpen(false);
        setIsNavOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openContextMenu = () => {
    const nextOpen = !isContextOpen;
    setIsContextOpen(nextOpen);
    if (nextOpen) {
      setViewMode(isViewingHistorical ? 'archive' : 'current');
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  };

  // --- DYNAMIC DATA BUCKETING ---
  const groupedData = useMemo(() => {
    const active: Record<string, SwitcherShow[]> = {};
    const upcoming: Record<string, SwitcherShow[]> = {};
    const archive: Record<string, SwitcherShow[]> = {};
    const allSeasons = new Set<string>();
    let currentCount = 0;
    let archiveCount = 0;

    shows.forEach((show) => {
      const season = show.season || 'Other';
      allSeasons.add(season);
      const bucket = classifyShowBucket(show);

      if (bucket === 'active') {
        if (!active[season]) active[season] = [];
        active[season].push(show);
        currentCount++;
      } else if (bucket === 'upcoming') {
        if (!upcoming[season]) upcoming[season] = [];
        upcoming[season].push(show);
        currentCount++;
      } else {
        if (!archive[season]) archive[season] = [];
        archive[season].push(show);
        archiveCount++;
      }
    });

    const seasons = Array.from(allSeasons).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    );

    return { active, upcoming, archive, seasons, currentCount, archiveCount };
  }, [shows]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterShowsByQuery(shows, searchQuery);
  }, [shows, searchQuery]);

  const handleSelectShow = (targetId: number) => {
    if (!targetId || switchingToId === targetId) return;
    setSwitchingToId(targetId);

    try {
      localStorage.setItem('openBackstage_lastActiveId', String(targetId));
    } catch {
      // ignore storage errors
    }

    startTransition(async () => {
      try {
        const res = await switchProductionDirect(targetId, tenant, pathname);
        setIsContextOpen(false);
        setSearchQuery('');
        if (res.targetUrl && res.targetUrl !== pathname) {
          router.push(res.targetUrl);
        }
        router.refresh();
      } finally {
        setSwitchingToId(null);
      }
    });
  };

  const resolveMobileHref = (href: string) => {
    if (!href) return '/';
    if (href.includes('/active/')) {
      return resolvedShowId > 0 ? href.replace('/active/', `/${resolvedShowId}/`) : '/production';
    }
    return href;
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '??';

  return (
    <>
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        {/* LEFT: NAV & CONTEXT */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="p-2 -ml-2 text-zinc-400 md:hidden"
            aria-label="Toggle navigation"
          >
            {isNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="relative min-w-0" ref={contextRef}>
            <button
              type="button"
              onClick={openContextMenu}
              aria-expanded={isContextOpen}
              aria-haspopup="listbox"
              className={`flex flex-col items-start px-2.5 py-1.5 rounded-xl border transition-all text-left ${
                isViewingHistorical
                  ? 'bg-blue-950/40 border-blue-500/30 hover:bg-blue-950/60'
                  : isContextOpen
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'border-transparent hover:bg-zinc-900/70 hover:border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Production
                </span>
                {isViewingHistorical ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[9px] font-black uppercase tracking-wider text-blue-300">
                    <History size={9} /> Historical
                  </span>
                ) : activeBucket === 'upcoming' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider text-amber-300">
                    Upcoming
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-white max-w-[165px] truncate sm:max-w-[260px] md:max-w-[340px]">
                  {activeShow.title}
                </span>
                {activeShow.season && (
                  <span className="hidden sm:inline text-[11px] font-semibold text-zinc-400">
                    ({activeShow.season})
                  </span>
                )}
                {isPending ? (
                  <Loader2 size={13} className="text-blue-400 animate-spin shrink-0" />
                ) : (
                  <ChevronsUpDown size={13} className="text-zinc-500 shrink-0" />
                )}
              </div>
            </button>

            {isContextOpen && (
              <div className="absolute top-full left-0 mt-2 w-[min(22rem,calc(100vw-2rem))] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[78vh] animate-in fade-in slide-in-from-top-2 duration-150">
                {/* RETURN TO ACTIVE SHOW BANNER */}
                {isViewingHistorical && defaultActiveShow && defaultActiveShow.id !== resolvedShowId && (
                  <div className="px-3 py-2.5 bg-blue-950/60 border-b border-blue-500/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">
                        Viewing Archive
                      </p>
                      <p className="text-[11px] text-zinc-300 truncate">
                        Active: <span className="font-bold text-white">{defaultActiveShow.title}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectShow(defaultActiveShow.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={11} /> Active
                    </button>
                  </div>
                )}

                {/* SEARCH INPUT */}
                <div className="p-2.5 bg-zinc-950/80 border-b border-white/5">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search shows or seasons..."
                      className="w-full pl-8 pr-7 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/60"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        aria-label="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* TABS (hidden while searching) */}
                {!searchQuery.trim() && (
                  <div className="bg-zinc-950/60 px-2.5 py-2 border-b border-white/5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('current')}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                        viewMode === 'current'
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Current
                      <span className="px-1.5 py-0.5 rounded bg-black/25 text-[9px]">
                        {groupedData.currentCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('archive')}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                        viewMode === 'archive'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      History
                      <span className="px-1.5 py-0.5 rounded bg-black/25 text-[9px]">
                        {groupedData.archiveCount}
                      </span>
                    </button>
                  </div>
                )}

                <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                  {/* SEARCH RESULTS MODE */}
                  {searchQuery.trim() ? (
                    <div className="space-y-1">
                      {searchResults.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-500">
                          No productions match &ldquo;{searchQuery.trim()}&rdquo;
                        </div>
                      ) : (
                        searchResults.map((prod) => (
                          <ContextButton
                            key={prod.id}
                            prod={prod}
                            isActive={prod.id === resolvedShowId}
                            isLoading={switchingToId === prod.id}
                            showSeason
                            onSelect={() => handleSelectShow(prod.id)}
                          />
                        ))
                      )}
                    </div>
                  ) : viewMode === 'current' ? (
                    /* TAB: CURRENT */
                    <div className="space-y-5">
                      {groupedData.currentCount === 0 && (
                        <div className="py-6 text-center text-xs text-zinc-500">
                          No active or upcoming productions. Switch to History to browse past shows.
                        </div>
                      )}
                      {groupedData.seasons.map((season) => {
                        const hasActive = groupedData.active[season]?.length > 0;
                        const hasUpcoming = groupedData.upcoming[season]?.length > 0;
                        if (!hasActive && !hasUpcoming) return null;

                        return (
                          <div key={season} className="space-y-2.5">
                            <div className="px-3 py-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-950/60 rounded-md">
                              Season {season}
                            </div>

                            {hasActive && (
                              <div className="space-y-1">
                                <div className="px-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                  <Clock size={10} /> Now Playing
                                </div>
                                {groupedData.active[season].map((prod) => (
                                  <ContextButton
                                    key={prod.id}
                                    prod={prod}
                                    isActive={prod.id === resolvedShowId}
                                    isLoading={switchingToId === prod.id}
                                    onSelect={() => handleSelectShow(prod.id)}
                                  />
                                ))}
                              </div>
                            )}

                            {hasUpcoming && (
                              <div className="space-y-1">
                                <div className="px-3 flex items-center gap-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                  <Rocket size={10} /> Pre-Production
                                </div>
                                {groupedData.upcoming[season].map((prod) => (
                                  <ContextButton
                                    key={prod.id}
                                    prod={prod}
                                    isActive={prod.id === resolvedShowId}
                                    isLoading={switchingToId === prod.id}
                                    onSelect={() => handleSelectShow(prod.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* TAB: HISTORY */
                    <div className="space-y-1.5">
                      {groupedData.archiveCount === 0 && (
                        <div className="py-6 text-center text-xs text-zinc-500">
                          No historical productions archived yet.
                        </div>
                      )}
                      {groupedData.seasons.map((season, idx) => {
                        const seasonShows = groupedData.archive[season];
                        if (!seasonShows || seasonShows.length === 0) return null;
                        const containsActiveShow = seasonShows.some((s) => s.id === resolvedShowId);
                        const defaultOpen = containsActiveShow || idx === 0;

                        return (
                          <details
                            key={season}
                            open={defaultOpen}
                            className="group rounded-xl border border-white/5 bg-zinc-950/30 overflow-hidden"
                          >
                            <summary className="flex items-center justify-between px-3 py-2.5 text-[10px] font-black text-zinc-300 uppercase tracking-wider bg-zinc-950/60 cursor-pointer hover:bg-zinc-800/80 list-none transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <Calendar size={12} className="text-blue-400 shrink-0" />
                                <span className="truncate">{season}</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-bold text-zinc-400">
                                  {seasonShows.length}
                                </span>
                                {containsActiveShow && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                )}
                              </div>
                              <ChevronRight
                                size={13}
                                className="text-zinc-500 group-open:rotate-90 transition-transform duration-200 shrink-0"
                              />
                            </summary>
                            <div className="p-1.5 space-y-1">
                              {seasonShows.map((prod) => (
                                <ContextButton
                                  key={prod.id}
                                  prod={prod}
                                  isActive={prod.id === resolvedShowId}
                                  isLoading={switchingToId === prod.id}
                                  onSelect={() => handleSelectShow(prod.id)}
                                />
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: TOOLS & PROFILE */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`hidden md:block p-2 rounded-full transition-all ${
              showDebug ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-700 hover:text-zinc-400'
            }`}
            aria-label="Toggle data stream debug"
          >
            <Wrench size={18} />
          </button>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 group">
              <div className="hidden md:flex flex-col items-end leading-tight text-right">
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                  {user?.name || 'Sign In'}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-tighter ${
                    isSimulating ? 'text-red-500 animate-pulse' : 'text-zinc-500'
                  }`}
                >
                  {effectiveRole || 'Guest'}
                </span>
              </div>
              <div
                className={`w-8 h-8 rounded-full bg-zinc-800 border flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:border-emerald-500/50 transition-all ${
                  isSimulating ? 'border-red-500/50 ring-2 ring-red-500/20' : 'border-zinc-700'
                }`}
              >
                {user?.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.image} alt="User Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-white/5 bg-zinc-950/50 rounded-t-lg mb-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                    Session Account
                  </p>
                  <p className="text-[11px] font-bold text-white truncate">
                    {user?.email || 'No email linked'}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 w-full p-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
                >
                  <Settings size={14} /> Settings
                </Link>
                <button
                  onClick={() => handleLogout()}
                  className="flex items-center gap-2 w-full p-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE NAV DRAWER */}
      {isNavOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNavOpen(false)} />
          <div
            ref={navRef}
            className="relative w-72 max-w-[85vw] bg-zinc-900 h-full border-r border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
          >
            <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <span className="text-sm font-black tracking-tighter text-blue-500">
                OPEN<span className="text-white">BACKSTAGE</span>
              </span>
              <button
                type="button"
                onClick={() => setIsNavOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {NAV_CONFIG.map((section) => {
                if (section.permission && !hasPermission(effectiveRole, productionRole, section.permission as any))
                  return null;
                if (section.title === 'Dashboard') return null;

                return (
                  <div key={section.title}>
                    <div
                      className={`px-3 mb-2 text-[10px] font-black uppercase tracking-widest mt-2 ${
                        section.color || 'text-zinc-600'
                      }`}
                    >
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item: any) => {
                        if (item.permission && !hasPermission(effectiveRole, productionRole, item.permission as any))
                          return null;

                        if (item.isCollapsible && item.children) {
                          return (
                            <div
                              key={item.label}
                              className="pl-2 border-l border-zinc-800 ml-2 mt-2 mb-2 space-y-1"
                            >
                              <div className="text-[9px] font-bold text-zinc-500 uppercase px-3 py-1">
                                {item.label}
                              </div>
                              {item.children.map((child: any) => {
                                if (
                                  child.permission &&
                                  !hasPermission(effectiveRole, productionRole, child.permission as any)
                                )
                                  return null;
                                const resolvedChildHref = resolveMobileHref(child.href);
                                return (
                                  <MenuLink
                                    key={child.href}
                                    onClick={() => setIsNavOpen(false)}
                                    href={resolvedChildHref}
                                    icon={<child.icon size={16} />}
                                    label={child.label}
                                    active={cleanPathname === resolvedChildHref}
                                  />
                                );
                              })}
                            </div>
                          );
                        }

                        const resolvedItemHref = resolveMobileHref(item.href);
                        return (
                          <MenuLink
                            key={item.href}
                            onClick={() => setIsNavOpen(false)}
                            href={resolvedItemHref}
                            icon={<item.icon size={18} />}
                            label={item.label}
                            active={cleanPathname === resolvedItemHref}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/5 bg-zinc-950/50">
              <button
                onClick={() => handleLogout()}
                className="flex items-center gap-3 w-full p-2 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} /> <span className="text-xs font-bold uppercase">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG CONSOLE */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 w-80 bg-black/90 border border-amber-500/50 rounded-xl p-4 font-mono text-[10px] text-amber-500 z-[100] shadow-2xl backdrop-blur-xl animate-in zoom-in-95">
          <p className="font-black border-b border-amber-500/20 mb-2 pb-1 flex items-center gap-2">
            <Bug size={12} /> DATA STREAM DEBUG
          </p>
          <div className="space-y-1">
            <p>Total Records: {shows.length}</p>
            <p>Resolved Show ID: {resolvedShowId}</p>
            <p className="mt-2 text-white font-black italic">ACTIVE / UPCOMING MAP:</p>
            {shows
              .filter((s) => classifyShowBucket(s) !== 'archive')
              .map((s) => (
                <div key={s.id}>
                  • {s.title} (Status: {s.status})
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

// --- SUB COMPONENTS ---

function MenuLink({ href, icon, label, active, onClick }: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${
        active
          ? 'bg-emerald-600 text-white shadow-lg'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </Link>
  );
}

function ContextButton({
  prod,
  isActive,
  isLoading,
  showSeason,
  onSelect,
}: {
  prod: SwitcherShow;
  isActive: boolean;
  isLoading?: boolean;
  showSeason?: boolean;
  onSelect: () => void;
}) {
  const bucket = classifyShowBucket(prod);
  const dotColor =
    bucket === 'active'
      ? 'bg-emerald-500'
      : bucket === 'upcoming'
      ? 'bg-amber-400'
      : 'bg-blue-400/70';

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left group ${
        isActive
          ? 'bg-zinc-800 ring-1 ring-blue-500/40'
          : 'hover:bg-zinc-800/60'
      } disabled:opacity-60`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div
          className={`text-xs truncate ${
            isActive ? 'text-white font-bold' : 'text-zinc-200 group-hover:text-white'
          }`}
        >
          {prod.title}
        </div>
        <div className="text-[10px] font-semibold text-zinc-500 truncate">
          {showSeason && prod.season ? `${prod.season} • ` : ''}
          {prod.location || 'General'} • {prod.status || 'Archived'}
        </div>
      </div>
      {isLoading ? (
        <Loader2 size={13} className="text-blue-400 animate-spin shrink-0" />
      ) : isActive ? (
        <Check size={13} className="text-blue-400 shrink-0" />
      ) : null}
    </button>
  );
}
