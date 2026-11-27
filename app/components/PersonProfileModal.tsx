"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  X,
  Mail,
  Phone,
  Copy,
  Check,
  Briefcase,
  Theater,
  GraduationCap,
  MapPin,
  ShieldAlert,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { getPersonProfileAction } from "@/app/actions/person-profile";
import type { PersonProfileData } from "@/app/lib/db/person-profile-repo";

export interface PersonCardPreview {
  personId?: number | null;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  headshot?: string | null;
  initials?: string;
  color?: string;
}

interface PersonProfileModalProps {
  person: PersonCardPreview;
  tenant?: string;
  onClose: () => void;
}

function computeInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PersonProfileModal({
  person,
  tenant: tenantProp,
  onClose,
}: PersonProfileModalProps) {
  const params = useParams();
  const tenant = tenantProp || (params?.tenant as string) || "";

  const [profile, setProfile] = useState<PersonProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (!tenant) return;
        const res = await getPersonProfileAction(tenant, {
          personId: person.personId ?? null,
          name: person.name,
          email: person.email ?? null,
        });
        if (active && res.ok && res.profile) {
          setProfile(res.profile);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tenant, person.personId, person.name, person.email]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const displayName = profile?.name || person.name;
  const candidateHeadshots = [profile?.headshotUrl, person.headshot].filter(
    (u): u is string => Boolean(u && u !== failedSrc)
  );
  const headshot = candidateHeadshots[0] || null;
  const email = profile?.email || person.email || "";
  const phone = profile?.phone || person.phone || "";
  const initials = person.initials || computeInitials(displayName);
  const avatarBg = person.color || "bg-blue-600";

  const copyText = async (value: string, field: "email" | "phone") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} profile`}
    >
      <div
        className="w-full sm:max-w-xl bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-6 bg-zinc-900/80 border-b border-white/10 flex items-start gap-4 shrink-0 relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
            {headshot ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={headshot}
                alt={displayName}
                onError={() => setFailedSrc(headshot)}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-lg font-black text-white ${avatarBg}`}
              >
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pr-8">
            <h2 className="text-xl font-black tracking-tight text-white truncate">
              {displayName}
            </h2>
            {person.role && (
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mt-0.5 truncate">
                {person.role}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile?.roles?.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300"
                >
                  {r}
                </span>
              ))}
              {profile?.city && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/60 text-[10px] font-medium text-zinc-400">
                  <MapPin size={10} />
                  {profile.city}
                  {profile.state ? `, ${profile.state}` : ""}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close person details"
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* CONTACT ACTIONS */}
          {(email || phone) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {email && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 min-w-0 text-xs text-zinc-200 hover:text-white transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 shrink-0">
                      <Mail size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Email
                      </div>
                      <div className="truncate font-semibold">{email}</div>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(email, "email")}
                    title="Copy email"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 shrink-0"
                  >
                    {copiedField === "email" ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              )}

              {phone && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2.5 min-w-0 text-xs text-zinc-200 hover:text-white transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                      <Phone size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Phone
                      </div>
                      <div className="truncate font-semibold">{phone}</div>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(phone, "phone")}
                    title="Copy phone"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 shrink-0"
                  >
                    {copiedField === "phone" ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Loader2 size={15} className="animate-spin text-blue-400" />
              Loading production history &amp; details...
            </div>
          ) : (
            <>
              {/* BIO */}
              {profile?.bio && (
                <section className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Biography
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </section>
              )}

              {/* PRODUCTION CREW / STAFF CREDITS */}
              {profile && profile.crewCredits.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <Briefcase size={12} /> Creative &amp; Production Team History ({profile.crewCredits.length})
                  </h3>
                  <div className="space-y-1.5">
                    {profile.crewCredits.map((credit, idx) => (
                      <Link
                        key={`crew-${credit.productionId}-${idx}`}
                        href={`/production/${credit.productionId}/team`}
                        onClick={onClose}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5 hover:bg-zinc-900 hover:border-white/15 transition-all group"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {credit.productionTitle}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-semibold truncate">
                            {credit.roleName}
                            {credit.season ? ` • ${credit.season}` : ""}
                          </div>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="text-zinc-600 group-hover:text-white shrink-0 transition-colors"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* CAST CREDITS */}
              {profile && profile.castCredits.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                    <Theater size={12} /> Cast History ({profile.castCredits.length})
                  </h3>
                  <div className="space-y-1.5">
                    {profile.castCredits.map((credit, idx) => (
                      <Link
                        key={`cast-${credit.productionId}-${idx}`}
                        href={`/production/${credit.productionId}/cast`}
                        onClick={onClose}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/5 hover:bg-zinc-900 hover:border-white/15 transition-all group"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                            {credit.roleName}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-semibold truncate">
                            {credit.productionTitle}
                            {credit.season ? ` • ${credit.season}` : ""}
                          </div>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="text-zinc-600 group-hover:text-white shrink-0 transition-colors"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* CLASSES TAUGHT */}
              {profile && profile.classesTaught.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-pink-400 flex items-center gap-1.5">
                    <GraduationCap size={12} /> Academy Classes Taught ({profile.classesTaught.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.classesTaught.map((cls) => (
                      <div
                        key={cls.classId}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-200"
                      >
                        {cls.title}
                        {cls.session ? (
                          <span className="text-zinc-500 ml-1.5 text-[10px]">{cls.session}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* EMERGENCY CONTACT (STAFF-ONLY) */}
              {profile && (profile.emergencyContactName || profile.emergencyContactPhone) && (
                <section className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert size={12} /> Emergency Contact
                  </h3>
                  <p className="text-xs text-amber-100 font-semibold">
                    {profile.emergencyContactName || "Emergency Contact"}
                    {profile.emergencyContactPhone ? ` • ${profile.emergencyContactPhone}` : ""}
                  </p>
                </section>
              )}

              {/* EMPTY FALLBACK */}
              {!profile && !email && !phone && (
                <p className="text-xs text-zinc-500 italic text-center py-4">
                  No additional directory details recorded for {displayName} yet.
                </p>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black uppercase tracking-widest text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
