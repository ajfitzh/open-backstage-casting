import Link from 'next/link';
import { auth } from "@/auth";
import { 
  Users, Calendar, BarChart3, 
  ChevronRight, Cat, 
  Theater, Waves, GraduationCap,
  UserCog, Mic, Scissors, LayoutGrid
} from 'lucide-react';
import FamilyHubStudentCard from '@/app/components/casting/FamilyHubStudentCard';
import FamilyConflictModal from '@/app/components/casting/FamilyConflictModal';
import ChairLogbook from '@/app/components/committees/ChairLogbook';
import { 
  getAssignments, 
  getCreativeTeam, 
  getClasses,
  getAuditionees,     
  getScenes,        
  getProductionEvents,
  getSeasons,
  getAllShows,
  getCommitteeData,
  getExistingAuditions,
  getUserProfile,
  getUserProductionRole
} from '@/app/lib/baserow';
import { getSelectedProduction } from '@/app/lib/production-context';
import { switchProduction } from '@/app/actions';
import { isPostgresEnabled } from '@/db';
import { getOrgLeadershipPg } from '@/app/lib/db/productions-repo';
import { getProductionAssetsPg } from '@/app/lib/db/operations-repo';
import { getTenantTableConfig } from '@/app/lib/tenant-config';
import { formatTenantDisplayName } from '@/app/lib/tenant-utils';
import { isStaffRole } from '@/app/lib/permissions';

import CreativeTeam from '@/app/components/dashboard/CreativeTeam';
import SeasonContext from '@/app/components/dashboard/SeasonContext';
import WorkflowProgress from '@/app/components/dashboard/WorkflowProgress';
import ShowGallerySection from '@/app/components/production/ShowGallerySection';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> | { tenant: string } }) {
  // Handle Next.js 15 params promise (safely unwrapping if needed)
  const resolvedParams = await params;
  const tenant = resolvedParams.tenant; 
  
  const session = await auth();
  
  // 1. Check the Role AND get the Email
  const userRole = (session?.user as any)?.role || "Guest";
  const userEmail = session?.user?.email || "";

  // Respect the active_production_id cookie (historical/upcoming switcher), falling back to the active show
  const { show, defaultActiveShow, isViewingHistorical } = await getSelectedProduction(tenant);

  if (!show) {
      return <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">No Active Show Found</div>;
  }

  // Check global role and show-specific production role using shared RBAC permissions
  const sessionUserId = Number((session?.user as any)?.id);
  let productionRole: string | null = null;
  if (!isStaffRole(userRole) && !Number.isNaN(sessionUserId) && sessionUserId > 0) {
      productionRole = await getUserProductionRole(tenant, sessionUserId, show.id);
  }
  const isStaff = isStaffRole(userRole, productionRole);
  const tenantTables = await getTenantTableConfig(tenant).catch(() => null);
  const tenantDisplayName = formatTenantDisplayName(tenant, tenantTables?.TENANT_NAME);

  // ==========================================
  // 👨‍👩‍👧‍👦 THE FAMILY HUB (Parents & Students)
  // ==========================================
  if (!isStaff) {
      // 1. Get all shows to find the Upcoming one
      const allShows = await getAllShows(tenant);
      const upcomingShow = allShows.find((s: any) => s.status === "Upcoming");

      // 2. Fetch auditions for the ACTIVE show and attach the show context
      let myAuditions = (await getExistingAuditions(tenant, userEmail, show.id)).map((a: any) => ({ ...a, _show: show }));

      // 3. Fetch auditions for the UPCOMING show and combine them
      if (upcomingShow && upcomingShow.id !== show.id) {
          const upcomingAuditions = (await getExistingAuditions(tenant, userEmail, upcomingShow.id)).map((a: any) => ({ ...a, _show: upcomingShow }));
          myAuditions = [...myAuditions, ...upcomingAuditions];
      }

      // 4. CHAIR LOGBOOK LOGIC: Check if this parent is a Committee Chair
      const userProfile = await getUserProfile(tenant, userEmail);
      const myPersonId = userProfile?.id ? parseInt(userProfile.id) : null;
      
      const allCommitteeData = await getCommitteeData(tenant, show.id);
      // Find the row for this parent where isChair is true
      const chairRecord = allCommitteeData.find((c: any) => c.email === userEmail && c.isChair);

      return (
        <div className="min-h-screen bg-zinc-950 p-4 sm:p-6 pb-20">
           <div className="max-w-4xl mx-auto space-y-8">
              
              <div className="flex items-center justify-between">
                 <div>
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Family Hub</h1>
                    <p className="text-zinc-400 text-sm font-medium">Logged in as {userEmail}</p>
                 </div>
                 <span className="px-3 py-1 bg-zinc-900 border border-white/10 rounded-full text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                    {tenantDisplayName}
                 </span>
              </div>

              {/* THE CHAIR LOGBOOK (Only renders if they are a Chair!) */}
              {chairRecord && myPersonId && (
                 <div className="animate-in fade-in slide-in-from-top-4">
                    <ChairLogbook 
                       tenant={tenant}
                       productionId={show.id}
                       submitterId={myPersonId}
                       committeeName={chairRecord.assignedPreShow || chairRecord.assignedShowWeek || "Committee"}
                    />
                 </div>
              )}

              <div className="space-y-4">
                 <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                   <h2 className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">My Students</h2>
                   <FamilyConflictModal
                     tenant={tenant}
                     productionId={show.id}
                     students={myAuditions.map((s: any) => ({
                       studentId: Number(s.studentId || s.id),
                       name: String(s.name || "Student"),
                     }))}
                   />
                 </div>
                 
                 {myAuditions.length === 0 ? (
                    <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-10 rounded-3xl text-center">
                       <p className="text-zinc-500 font-bold">No students registered for active shows.</p>
                    </div>
                 ) : (
                    <div className="grid gap-4">
                       {myAuditions.map((student: any) => (
                          <FamilyHubStudentCard 
                             key={`${student._show.id}-${student.id}`} 
                             student={student} 
                             show={student._show} 
                             tenant={tenant} 
                             userEmail={userEmail} 
                          />
                       ))}
                    </div>
                 )}
              </div>

              {/* UPCOMING SHOW BANNER FOR PARENTS */}
              {upcomingShow && (
                 <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group shadow-xl">
                    {upcomingShow.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={upcomingShow.image}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-4">
                       {upcomingShow.image && (
                         /* eslint-disable-next-line @next/next/no-img-element */
                         <img
                           src={upcomingShow.image}
                           alt={upcomingShow.title}
                           className="w-16 h-16 rounded-2xl object-cover border border-white/15 shadow-lg shrink-0"
                         />
                       )}
                       <div>
                         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span> Upcoming Auditions
                         </h3>
                         <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">{upcomingShow.title}</h2>
                       </div>
                    </div>
                    <Link 
                        href="/audition-form"
                        className="relative z-10 flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-900 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all w-full md:w-auto text-xs shrink-0"
                    >
                        Sign Up <ChevronRight size={16} />
                    </Link>
                 </div>
              )}
           </div>
        </div>
      );
  }

  // ==========================================
  // 📋 THE STAFF DASHBOARD (Admin/Director/Staff)
  // ==========================================

  const [
    assignments, 
    creativeTeam, 
    allClasses,
    auditionees,
    scenes,
    events,
    allSeasons,
    allShows,
    committeeData,
    orgLeaders,
    showAssets
  ] = await Promise.all([
      getAssignments(tenant, show.id),
      getCreativeTeam(tenant, show.id),
      getClasses(tenant),
      getAuditionees(tenant, show.id).catch(()=>[]),
      getScenes(tenant, show.id).catch(()=>[]),
      getProductionEvents(tenant, show.id).catch(()=>[]),
      getSeasons(tenant),
      getAllShows(tenant),
      getCommitteeData(tenant, show.id).catch(()=>[]),
      isPostgresEnabled() ? getOrgLeadershipPg(tenant, 4).catch(() => []) : Promise.resolve([]),
      isPostgresEnabled() ? getProductionAssetsPg(tenant, show.id).catch(() => []) : Promise.resolve([])
  ]);

  const galleryItems = (showAssets || [])
    .filter((a: any) => a.link && /^https?:\/\//i.test(a.link))
    .map((a: any) => ({
      id: Number(a.id),
      name: String(a.name || "Photo"),
      url: String(a.link),
      type: String(a.type || "Photo"),
    }));
  
  const upcomingShow = allShows.find((s: any) => s.status === "Upcoming");

  // SMART PHASE DETECTION
  const uniqueCast = new Set(assignments.filter((a: any) => a.personId).map((a: any) => a.personId));
  const uniqueAuditionees = new Set(auditionees.filter((a: any) => a.studentId).map((a: any) => a.studentId));
  const uniqueRegistered = new Set(committeeData.filter((c: any) => c.studentName).map((c: any) => c.studentName));

  let displayCount = 0;
  let displayLabel = "Cast";

  if (uniqueCast.size > 0) {
      displayCount = uniqueCast.size;
      displayLabel = "Cast";
  } else if (uniqueAuditionees.size > 0) {
      displayCount = uniqueAuditionees.size;
      displayLabel = "Auditioning";
  } else {
      displayCount = uniqueRegistered.size;
      displayLabel = "Registered";
  }

  const rawTags = show.workflowOverrides?.map((tag: any) => tag.value) || [];
  const workflowStatus = { tags: rawTags };

  const getShowTheme = (title: string) => {
    const t = (title || "").toLowerCase();
    if (t.includes('lion')) return { icon: <Cat size={220} />, color: 'text-orange-500', bg: 'from-orange-900/40 to-red-900/20', accent: 'text-orange-400' };
    if (t.includes('mermaid')) return { icon: <Waves size={220} />, color: 'text-cyan-500', bg: 'from-cyan-900/30 to-blue-900/20', accent: 'text-cyan-400' };
    return { icon: <Theater size={220} />, color: 'text-blue-500', bg: 'from-zinc-900 to-zinc-900', accent: 'text-blue-500' };
  };

  const theme = getShowTheme(show?.title);

  return (
    <div className="min-h-screen bg-zinc-950 p-5 md:p-6 pb-20 overflow-y-auto custom-scrollbar space-y-5">
      
      {/* HISTORICAL PRODUCTION BANNER */}
      {isViewingHistorical && (
        <div className="bg-blue-950/50 border border-blue-500/30 rounded-2xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-300 shrink-0">
              Historical Archive
            </span>
            <p className="text-xs text-zinc-300 truncate">
              Viewing <span className="font-bold text-white">{show.title}</span>
              {show.season ? ` (${show.season})` : ''}. All dashboard cards and sidebar links reflect this production.
            </p>
          </div>
          {defaultActiveShow && defaultActiveShow.id !== show.id && (
            <form action={switchProduction} className="shrink-0">
              <input type="hidden" name="productionId" value={defaultActiveShow.id} />
              <input type="hidden" name="tenant" value={tenant} />
              <input type="hidden" name="redirectPath" value="/" />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider transition-colors"
              >
                Return to {defaultActiveShow.title}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 1. HERO */}
      <div className={`relative overflow-hidden bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${theme.bg}`}>
         {show?.image ? (
           <>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img
               src={show.image}
               alt=""
               aria-hidden="true"
               className="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 blur-[2px] pointer-events-none"
             />
             <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/75 to-zinc-950/40 pointer-events-none" />
           </>
         ) : (
           <div className={`absolute -top-12 -right-12 p-8 opacity-10 rotate-12 transition-all duration-1000 ${theme.color}`}>
              {theme.icon}
           </div>
         )}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-6xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2.5">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-1000 ${isViewingHistorical ? 'text-blue-400' : theme.accent}`}>
                  {isViewingHistorical ? 'Historical Production' : show?.status === 'Upcoming' ? 'Upcoming Production' : 'Active Production'}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{show?.season}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mb-5 drop-shadow-2xl max-w-3xl leading-[0.95]">{show?.title}</h1>
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6">
                
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Link 
                        href={`/production/${show.id}/cast`}
                        className="group flex items-center gap-2 px-3.5 py-1.5 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg hover:bg-black/50 hover:scale-105 transition-all cursor-pointer"
                    >
                        <Users size={15} className="text-zinc-400 group-hover:text-white transition-colors"/>
                        <span className="text-xs font-black text-white group-hover:underline decoration-white/30 underline-offset-4">
                            {displayCount} {displayLabel}
                        </span>
                    </Link>

                    <Link 
                        href={`/production/${show.id}/team`}
                        className="group flex items-center gap-2 px-3.5 py-1.5 bg-black/30 rounded-full border border-white/10 backdrop-blur-xl shadow-lg hover:bg-black/50 hover:scale-105 transition-all cursor-pointer"
                    >
                         <UserCog size={15} className={`${theme.accent} group-hover:text-white transition-colors`}/>
                         <span className={`text-xs font-black ${theme.accent} group-hover:text-white group-hover:underline decoration-white/30 underline-offset-4 transition-colors`}>
                            Production Team
                         </span>
                    </Link>
                </div>

                <div className="hidden xl:block w-px h-7 bg-white/10"></div>
                {creativeTeam && <CreativeTeam team={creativeTeam as any} />}
            </div>
          </div>
          {show?.image && (
            <div className="hidden sm:block shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={show.image}
                alt={show.title}
                className="w-28 h-36 md:w-36 md:h-48 rounded-2xl object-cover border border-white/15 shadow-2xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. COMPACT SHOW PROGRESS TIMELINE */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         <WorkflowProgress status={workflowStatus} productionId={show.id} />
      </div>

      {/* 3. SLIM UPCOMING AUDITIONS RIBBON */}
      {upcomingShow && (
        <div className="bg-gradient-to-r from-blue-900/35 to-indigo-900/35 border border-blue-500/25 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden group shadow-lg">
           {upcomingShow.image && (
             /* eslint-disable-next-line @next/next/no-img-element */
             <img
               src={upcomingShow.image}
               alt=""
               aria-hidden="true"
               className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
             />
           )}
           <div className="relative z-10 flex items-center gap-3.5 min-w-0">
              {upcomingShow.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={upcomingShow.image}
                  alt={upcomingShow.title}
                  className="w-11 h-11 rounded-xl object-cover border border-white/15 shadow shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                   <Mic size={18} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span> Upcoming Auditions
                 </div>
                 <h2 className="text-base md:text-lg font-black text-white italic tracking-tight truncate">{upcomingShow.title}</h2>
              </div>
           </div>
           
           <Link 
               href="/audition-form"
               className="relative z-10 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-white text-blue-950 rounded-xl font-black uppercase tracking-wider shadow hover:bg-blue-50 transition-all w-full sm:w-auto text-[11px] shrink-0"
           >
               Sign Up <ChevronRight size={14} />
           </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2.5">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500" /> Daily Workspace</h3>
             <ActionCard href={`/production/${show.id}/schedule`} title="Rehearsal Schedule" desc="View and create calls, times, and conflicts" icon={<Calendar size={18} className="text-blue-400"/>} color="bg-blue-400"/>
             <ActionCard href={`/production/${show.id}/casting`} title="Casting & Auditions" desc="Manage auditions, callbacks and cast grid" icon={<Users size={18} className="text-indigo-400"/>} color="bg-indigo-400"/>
        </div>
        <div className="space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Logistics &amp; Wardrobe</h3>
            <ActionCard href={`/production/${show.id}/roster`} title="Master Roster" desc="Contact info, compliance and status tracker" icon={<Users size={18} className="text-emerald-400"/>} color="bg-emerald-400"/>
            <ActionCard href={`/production/${show.id}/costumes`} title="Wardrobe & QR Inventory" desc="Measurements, garment stock, QR labels & scanner" icon={<Scissors size={18} className="text-pink-400"/>} color="bg-pink-400"/>
        </div>
        <div className="space-y-2.5">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500" /> Academy &amp; Season</h3>
             <ActionCard href="/education" title="Class Manager" desc="Weekly attendance status and enrollment" icon={<GraduationCap size={18} className="text-pink-400"/>} color="bg-pink-400"/>
             <ActionCard href="/season" title="Season Planner" desc="Plan multi-show seasons, staffing & reports" icon={<LayoutGrid size={18} className="text-purple-400"/>} color="bg-purple-400"/>
        </div>
      </div>

      <ShowGallerySection
          key={show.id}
          tenant={tenant}
          productionId={show.id}
          showTitle={show.title}
          coverImageUrl={show.image}
          initialItems={galleryItems}
          canUpload={isStaff}
      />

      <SeasonContext 
          activeSeasonName={show?.season} 
          seasons={allSeasons}
          allClasses={allClasses} 
          allShows={allShows} 
          activeShowStats={{ castCount: displayCount }}
          orgLeaders={orgLeaders}
      />

      <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Open Backstage</div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] text-zinc-500 font-black uppercase tracking-widest">{tenantDisplayName}</div>
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] text-blue-500 font-black uppercase tracking-widest">{userRole}</div>
          </div>
      </div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon, color }: any) {
    return (
        <Link href={href} className="group relative block bg-zinc-900/50 border border-white/5 p-4 rounded-2xl hover:bg-zinc-900 hover:border-white/10 transition-all duration-300 shadow-lg overflow-hidden backdrop-blur-sm">
            <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500 ${color}`} />
            <div className="flex items-center gap-3.5 relative z-10">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 group-hover:scale-105 group-hover:bg-black/60 transition-all duration-300 shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-sm group-hover:text-white transition-colors tracking-tight">{title}</h4>
                    <p className="text-[11px] text-zinc-500 font-medium line-clamp-1">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-zinc-800 group-hover:text-white transition-all transform group-hover:translate-x-1 shrink-0" />
            </div>
        </Link>
    )
}