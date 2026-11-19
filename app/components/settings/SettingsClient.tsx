"use client";

import React, { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  User, Shield, Monitor, Lock,
  LogOut, Mail, CheckCircle2, Users,
  CreditCard, ChevronRight, Phone, MapPin,
  Save, Loader2, Upload, Search, UserCog, X, ChevronUp, Rocket
} from 'lucide-react';
import { switchProduction } from '@/app/actions';
import { updateMyProfile, updateUserRoles, setProductionStatus } from '@/app/actions/admin';
import ShowLaunchPanel, {
  type AuditionSlotSummary,
  type ShowTeamMemberSummary,
  type SimpleOption,
} from './ShowLaunchPanel';
import { signOut } from "next-auth/react";
import {
  hasPermission,
  isAdminRole,
  ASSIGNABLE_GLOBAL_ROLES,
  type Permission,
} from '@/app/lib/permissions';
import { useSimulation } from '@/app/context/SimulationContext';

export interface FamilyMember {
  id: number;
  name: string;
  role: string;
  age: number;
  image: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  id: string;
  address: string;
  image?: string | null;
  familyMembers: FamilyMember[];
}

export interface DirectoryPerson {
  id: number;
  name: string;
  email: string;
  phone: string;
  headshot: string | null;
  roles: string[];
}

interface SettingsProps {
  tenant: string;
  shows: any[];
  activeId: number;
  initialUser: UserProfile;
  realProductionRole: string | null;
  directoryPeople?: DirectoryPerson[];
  seasons?: SimpleOption[];
  masterShows?: { id: number; title: string }[];
  staffPositions?: SimpleOption[];
  initialSlots?: AuditionSlotSummary[];
  initialTeam?: ShowTeamMemberSummary[];
}

export default function SettingsClient({
  tenant,
  shows,
  activeId,
  initialUser,
  realProductionRole,
  directoryPeople = [],
  seasons = [],
  masterShows = [],
  staffPositions = [],
  initialSlots = [],
  initialTeam = [],
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [godModeOpen, setGodModeOpen] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(initialUser.name || '');
  const [phone, setPhone] = useState(initialUser.phone || '');
  const addressParts = (initialUser.address || '').split(',').map((s) => s.trim());
  const [streetAddress, setStreetAddress] = useState(addressParts[0] || '');
  const [city, setCity] = useState(addressParts.slice(1).join(', ') || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUser.image || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Admin: Team & Roles state
  const [peopleList, setPeopleList] = useState<DirectoryPerson[]>(directoryPeople);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [savingRolesId, setSavingRolesId] = useState<number | null>(null);
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin: Show statuses
  const [showList, setShowList] = useState<any[]>(shows);
  const [updatingShowId, setUpdatingShowId] = useState<number | null>(null);

  const {
    role: effectiveGlobalRole,
    productionRole: effectiveProdRole,
    simulate,
    reset,
    isSimulating,
  } = useSimulation();

  const activeShow = showList.find((s) => s.id === activeId) || showList[0];

  const checkAccess = useCallback(
    (perm: Permission) => {
      const granted = hasPermission(effectiveGlobalRole, effectiveProdRole, perm);
      return {
        granted,
        level: granted ? (perm.includes('edit') || perm.includes('manage') ? 'write' : 'read') : 'locked',
      };
    },
    [effectiveGlobalRole, effectiveProdRole]
  );

  const canSeeBilling = checkAccess('view_billing').granted;
  const canSeeSystem = checkAccess('view_cast_list').granted;
  const canManageTeam = isAdminRole(effectiveGlobalRole);
  const isRealAdmin = isAdminRole(initialUser.role);

  let safeTab = activeTab;
  if (activeTab === 'billing' && !canSeeBilling) safeTab = 'profile';
  if ((activeTab === 'permissions' || activeTab === 'context') && !canSeeSystem) safeTab = 'profile';
  if ((activeTab === 'team' || activeTab === 'launch') && !canManageTeam) safeTab = 'profile';

  const filteredPeople = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return peopleList.slice(0, 50);
    return peopleList
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.roles.some((r) => r.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [peopleList, peopleSearch]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);

    const res = await updateMyProfile(tenant, {
      fullName,
      phone,
      address: streetAddress,
      city,
      headshotUrl: avatarUrl || undefined,
    });

    setSavingProfile(false);
    if (res.success) {
      setProfileNotice({ type: 'success', text: 'Profile saved.' });
    } else {
      setProfileNotice({ type: 'error', text: res.error || 'Could not save profile.' });
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    setProfileNotice(null);
    try {
      const signRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, fileType: file.type }),
      });
      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        throw new Error(err.error || 'Upload request rejected.');
      }
      const { uploadUrl, publicUrl } = await signRes.json();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
        body: file,
      });
      if (!putRes.ok) throw new Error('Failed to upload image file.');

      setAvatarUrl(publicUrl);
      const saveRes = await updateMyProfile(tenant, { headshotUrl: publicUrl });
      if (!saveRes.success) throw new Error(saveRes.error || 'Uploaded photo, but failed to save to profile.');

      setProfileNotice({ type: 'success', text: 'Profile photo updated.' });
    } catch (err: any) {
      setProfileNotice({ type: 'error', text: err?.message || 'Photo upload failed.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const startEditingRoles = (person: DirectoryPerson) => {
    setEditingPersonId(person.id);
    setDraftRoles(person.roles);
    setAdminNotice(null);
  };

  const toggleDraftRole = (role: string) => {
    setDraftRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async (personId: number) => {
    setSavingRolesId(personId);
    setAdminNotice(null);

    const res = await updateUserRoles(tenant, personId, draftRoles);
    setSavingRolesId(null);

    if (res.success) {
      setPeopleList((prev) =>
        prev.map((p) => (p.id === personId ? { ...p, roles: res.roles || draftRoles } : p))
      );
      setEditingPersonId(null);
      setAdminNotice({ type: 'success', text: 'User roles updated.' });
    } else {
      setAdminNotice({ type: 'error', text: res.error || 'Failed to update roles.' });
    }
  };

  const handleProductionStatusChange = async (showId: number, status: string) => {
    setUpdatingShowId(showId);
    setAdminNotice(null);
    const res = await setProductionStatus(tenant, showId, status);
    setUpdatingShowId(null);
    if (res.success) {
      setShowList((prev) => prev.map((s) => (s.id === showId ? { ...s, status } : s)));
      setAdminNotice({ type: 'success', text: `Production status updated to "${status}".` });
    } else {
      setAdminNotice({ type: 'error', text: res.error || 'Could not update production status.' });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto w-full relative">
      {/* INNER SIDEBAR NAVIGATION */}
      <nav className="w-full lg:w-64 flex flex-col gap-1 shrink-0">
        <div className="px-4 py-4 mb-2">
          <h1 className="text-xl font-black italic tracking-tighter text-white">SETTINGS</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage your backstage identity</p>
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold uppercase text-zinc-600 tracking-widest mt-4 mb-2">Account</p>
          <TabButton id="profile" label="My Profile" icon={<User size={18} />} active={safeTab} onClick={setActiveTab} />
          <TabButton id="family" label="Family Members" icon={<Users size={18} />} active={safeTab} onClick={setActiveTab} />

          {canSeeBilling && (
            <TabButton id="billing" label="Billing & Donations" icon={<CreditCard size={18} />} active={safeTab} onClick={setActiveTab} />
          )}
        </div>

        {canSeeSystem && (
          <div className="space-y-1 animate-in slide-in-from-left-2 fade-in duration-300">
            <p className="px-4 text-[10px] font-bold uppercase text-zinc-600 tracking-widest mt-6 mb-2">System</p>
            <TabButton id="context" label="Workspace & Shows" icon={<Monitor size={18} />} active={safeTab} onClick={setActiveTab} />
            <TabButton id="permissions" label="My Clearance" icon={<Shield size={18} />} active={safeTab} onClick={setActiveTab} />
            {canManageTeam && (
              <>
                <TabButton id="launch" label="Show Launch" icon={<Rocket size={18} />} active={safeTab} onClick={setActiveTab} />
                <TabButton id="team" label="Team & Roles" icon={<UserCog size={18} />} active={safeTab} onClick={setActiveTab} />
              </>
            )}
          </div>
        )}

        <div className="mt-auto pt-6 px-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all w-full text-left"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-h-[600px] bg-zinc-900/50 border border-white/5 rounded-3xl p-8 overflow-y-auto custom-scrollbar relative">
        {safeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Profile & Contact</h2>
                <p className="text-zinc-500 text-sm">Manage your personal contact information.</p>
              </div>
              <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wide">
                {initialUser.role}
              </div>
            </div>

            {profileNotice && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-bold border ${
                  profileNotice.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {profileNotice.text}
              </div>
            )}

            <div className="flex items-center gap-6 pb-8 border-b border-white/5">
              <div className="w-24 h-24 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-3xl font-black text-zinc-500 shadow-2xl relative overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName || 'Profile'} className="w-full h-full object-cover" />
                ) : fullName ? (
                  fullName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                ) : (
                  'OB'
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                </button>
                <p className="text-[11px] text-zinc-500">JPG, PNG, or WebP.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Full Name" value={fullName} onChange={setFullName} icon={<User size={16} />} />
              <InputGroup label="Email Address" value={initialUser.email} icon={<Mail size={16} />} disabled />
              <InputGroup label="Phone Number" value={phone} onChange={setPhone} icon={<Phone size={16} />} />
              <InputGroup label="City" value={city} onChange={setCity} icon={<MapPin size={16} />} />
              <div className="md:col-span-2">
                <InputGroup label="Street Address" value={streetAddress} onChange={setStreetAddress} icon={<MapPin size={16} />} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {safeTab === 'family' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-end gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Family Members</h2>
                <p className="text-zinc-500 text-sm">Manage dependants and medical forms.</p>
              </div>
              <Link
                href="/settings/family"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors"
              >
                Open Master Family Profile
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {initialUser.familyMembers.length === 0 ? (
                <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-sm">
                  No family members linked to your account.
                </div>
              ) : (
                initialUser.familyMembers.map((member) => (
                  <Link
                    key={member.id}
                    href="/settings/family"
                    className="group p-4 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10 rounded-xl transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 overflow-hidden relative border border-white/5">
                        {member.image ? (
                          <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">{member.name}</h3>
                        <p className="text-xs text-zinc-500">
                          {member.role} • {member.age} yrs old
                        </p>
                      </div>
                    </div>
                    <span className="p-2 group-hover:bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {safeTab === 'context' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Workspace & Shows</h2>
              <p className="text-zinc-500 text-sm">
                Switch your active production workspace{canManageTeam ? ' or update production statuses.' : '.'}
              </p>
            </div>

            {adminNotice && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-bold border ${
                  adminNotice.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {adminNotice.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {showList.map((show) => (
                <div
                  key={show.id}
                  className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                    activeId === show.id
                      ? 'bg-emerald-900/10 border-emerald-500/50'
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <form action={switchProduction} className="flex-1">
                    <input type="hidden" name="productionId" value={show.id} />
                    <input type="hidden" name="redirectPath" value="/settings" />
                    <button className="w-full flex items-center gap-4 text-left">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black shrink-0 ${
                          activeId === show.id ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {(show.title || '?').charAt(0)}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${activeId === show.id ? 'text-white' : 'text-zinc-300'}`}>
                          {show.title}
                        </div>
                        <div className="text-xs font-medium text-zinc-500">
                          {show.location || show.season || 'Production'}
                          {show.status ? ` • ${show.status}` : ''}
                        </div>
                      </div>
                    </button>
                  </form>

                  <div className="flex items-center gap-3 shrink-0">
                    {activeId === show.id && (
                      <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                        <CheckCircle2 size={16} /> Selected
                      </div>
                    )}
                    {canManageTeam && (
                      <select
                        aria-label={`Status for ${show.title}`}
                        disabled={updatingShowId === show.id}
                        value={show.status || 'Active'}
                        onChange={(e) => handleProductionStatusChange(show.id, e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-200 focus:border-blue-500 outline-none disabled:opacity-50"
                      >
                        <option value="Active">Active</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Archived">Archived</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {safeTab === 'permissions' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Security Clearance</h2>
              <p className="text-zinc-500 text-sm mb-4">
                Your access level for <span className="text-white font-bold">{activeShow?.title}</span>.
              </p>

              <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Global Role: {effectiveGlobalRole}
                      {effectiveGlobalRole !== initialUser.role && (
                        <span className="text-red-400 ml-2 text-xs uppercase">(Simulated)</span>
                      )}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      Show Role: {effectiveProdRole || 'None'}
                      {effectiveProdRole !== realProductionRole && (
                        <span className="text-red-400 ml-2 uppercase">(Simulated)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <PermissionSection
                title="Production Management"
                permissions={[
                  { label: 'Cast Grid Access', desc: 'View master cast list.', ...checkAccess('view_cast_list') },
                  { label: 'Casting Management', desc: 'Modify roles and assignments.', ...checkAccess('manage_casting') },
                  { label: 'Compliance Data', desc: 'Access medical forms.', ...checkAccess('edit_compliance') },
                  { label: 'Check-In Kiosk', desc: 'Manage audition and rehearsal check-ins.', ...checkAccess('view_checkin') },
                  { label: 'Committees', desc: 'Assign committee volunteers and chairs.', ...checkAccess('manage_committees') },
                ]}
              />

              <PermissionSection
                title="Financials & Sensitive Data"
                permissions={[
                  { label: 'Budget Reports', desc: 'View production budget.', ...checkAccess('view_financials') },
                  { label: 'Billing & Invoices', desc: 'View personal billing history.', ...checkAccess('view_billing') },
                  { label: 'Sensitive Reports', desc: 'View incident reports.', ...checkAccess('view_sensitive_reports') },
                ]}
              />
            </div>
          </div>
        )}

        {safeTab === 'launch' && canManageTeam && (
          <ShowLaunchPanel
            tenant={tenant}
            activeShowId={activeShow?.id || activeId}
            activeShowTitle={activeShow?.title || 'Active Show'}
            seasons={seasons}
            masterShows={masterShows}
            staffPositions={staffPositions}
            people={peopleList}
            initialSlots={initialSlots}
            initialTeam={initialTeam}
            onProductionCreated={(created) => setShowList((prev) => [created, ...prev])}
          />
        )}

        {safeTab === 'team' && canManageTeam && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Team & Roles</h2>
                <p className="text-zinc-500 text-sm">
                  Search people in this workspace and manage their global RBAC roles directly.
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                {peopleList.length} People
              </span>
            </div>

            {adminNotice && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-bold border ${
                  adminNotice.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {adminNotice.text}
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus-within:border-blue-500/50">
              <Search size={16} className="text-zinc-500" />
              <input
                type="text"
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                placeholder="Search by name, email, or role (e.g., Admin, Finance, Committee)..."
                className="bg-transparent outline-none w-full text-sm text-white placeholder-zinc-600"
              />
              {peopleSearch && (
                <button type="button" onClick={() => setPeopleSearch('')} className="text-zinc-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredPeople.length === 0 ? (
                <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-sm">
                  No matching people found.
                </div>
              ) : (
                filteredPeople.map((person) => {
                  const isEditing = editingPersonId === person.id;
                  return (
                    <div
                      key={person.id}
                      className="p-4 bg-black/25 border border-white/5 rounded-2xl space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">{person.name || 'Unnamed Person'}</p>
                          <p className="text-xs text-zinc-500">{person.email || 'No email on file'}</p>
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                          {person.roles.length === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-500">
                              No Role
                            </span>
                          ) : (
                            person.roles.map((r) => (
                              <span
                                key={r}
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-500/15 border border-blue-500/30 text-blue-300"
                              >
                                {r}
                              </span>
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingPersonId(null) : startEditingRoles(person))}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                          >
                            {isEditing ? 'Cancel' : 'Edit Roles'}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="pt-3 border-t border-white/5 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {ASSIGNABLE_GLOBAL_ROLES.map((roleName) => {
                              const selected = draftRoles.includes(roleName);
                              return (
                                <button
                                  key={roleName}
                                  type="button"
                                  onClick={() => toggleDraftRole(roleName)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    selected
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {roleName}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={savingRolesId === person.id}
                              onClick={() => handleSaveRoles(person.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                            >
                              {savingRolesId === person.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Save size={14} />
                              )}
                              Save Roles
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {safeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Billing & Donations</h2>
              <p className="text-zinc-500 text-sm">Production fees and payment processing.</p>
            </div>
            <div className="p-10 border border-dashed border-zinc-800 bg-black/20 rounded-2xl flex flex-col items-center justify-center text-center max-w-xl">
              <CreditCard size={40} className="text-zinc-600 mb-4" />
              <h3 className="text-zinc-200 font-bold mb-2">Payments Handled via Stripe Checkout</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Saved card management is not stored inside Open Backstage. Production fees and donations are processed
                securely through Stripe during registration and role acceptance.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* COLLAPSIBLE ROLE SIMULATOR (ADMIN ONLY) */}
      {isRealAdmin && (
        <div className="fixed bottom-5 right-5 z-50">
          {!godModeOpen ? (
            <button
              type="button"
              onClick={() => setGodModeOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-xl text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all ${
                isSimulating
                  ? 'bg-red-950/90 border-red-500/60 text-red-200'
                  : 'bg-zinc-950/90 border-white/15 text-zinc-300 hover:text-white hover:border-white/30'
              }`}
            >
              <Shield size={14} className={isSimulating ? 'text-red-400' : 'text-zinc-400'} />
              {isSimulating ? `Simulating: ${effectiveGlobalRole}` : 'Role Simulator'}
              <ChevronUp size={14} />
            </button>
          ) : (
            <div className="bg-zinc-950 border border-red-500/30 shadow-2xl rounded-xl p-4 w-72 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3 text-red-400 border-b border-white/5 pb-2">
                <Shield size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Role Simulator</span>
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto text-[10px] underline text-zinc-500 hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setGodModeOpen(false)}
                  aria-label="Minimize Role Simulator"
                  className="text-zinc-500 hover:text-white ml-1"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Simulate Global Role</label>
                  <select
                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                    value={isSimulating ? effectiveGlobalRole : ''}
                    onChange={(e) => simulate(e.target.value || null, effectiveProdRole)}
                  >
                    <option value="">Real ({initialUser.role})</option>
                    {ASSIGNABLE_GLOBAL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Simulate Show Role</label>
                  <select
                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                    value={effectiveProdRole || ''}
                    onChange={(e) =>
                      simulate(
                        effectiveGlobalRole === initialUser.role ? null : effectiveGlobalRole,
                        e.target.value || null
                      )
                    }
                  >
                    <option value="">Real ({realProductionRole || 'None'})</option>
                    <option value="Director">Director</option>
                    <option value="Music Director">Music Director</option>
                    <option value="Choreographer">Choreographer</option>
                    <option value="Stage Manager">Stage Manager</option>
                    <option value="Producer">Producer</option>
                    <option value="None">None (Standard)</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2 items-center">
                <div
                  className={`h-2 w-2 rounded-full ${
                    checkAccess('view_financials').granted ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <div className="text-[10px] text-zinc-400">
                  {checkAccess('view_financials').granted ? 'Can See Financials' : 'Cannot See Financials'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ id, label, icon, active, onClick }: any) {
  const isActive = active === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`
        group flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all w-full text-left relative overflow-hidden
        ${isActive ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}
      `}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
      <span className={`${isActive ? 'text-blue-400' : 'group-hover:text-zinc-400'}`}>{icon}</span>
      {label}
    </button>
  );
}

function InputGroup({
  label,
  value,
  onChange,
  icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="group">
      <label className="block text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">{label}</label>
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          ${
            disabled
              ? 'bg-zinc-900/30 border-white/5 text-zinc-600 cursor-not-allowed'
              : 'bg-black/20 border-white/10 text-white group-hover:border-white/20 focus-within:border-blue-500/50 focus-within:bg-black/40'
          }
        `}
      >
        <div className={`${disabled ? 'text-zinc-700' : 'text-zinc-500'}`}>{icon}</div>
        <input
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          disabled={disabled}
          readOnly={disabled}
          className="bg-transparent outline-none w-full text-sm font-medium placeholder-zinc-700"
        />
        {disabled && <Lock size={12} className="text-zinc-700" />}
      </div>
    </div>
  );
}

function PermissionSection({ title, permissions }: { title: string; permissions: any[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {permissions.map((p: any, i: number) => (
          <div
            key={i}
            className={`p-4 rounded-xl border flex items-start gap-4 ${
              p.granted ? 'bg-zinc-900/80 border-white/10' : 'bg-transparent border-white/5 opacity-50'
            }`}
          >
            <div className={`mt-0.5 ${p.granted ? 'text-emerald-500' : 'text-zinc-600'}`}>
              {p.granted ? <CheckCircle2 size={18} /> : <Lock size={18} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h4 className={`text-sm font-bold ${p.granted ? 'text-white' : 'text-zinc-500'}`}>{p.label}</h4>
                {p.granted && (
                  <span className="text-[10px] uppercase font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-white/5">
                    {p.level}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 leading-snug">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
