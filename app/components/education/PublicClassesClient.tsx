// app/components/education/PublicClassesClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

export interface PublicClassItem {
  id: number;
  className: string;
  teacherName: string;
  location?: string;
  roomName: string;
  day: string;
  timeSlot: string;
  minAge: number | null;
  maxAge: number | null;
  type: string;
  description: string;
  tuitionCents: number;
  capacity: number;
  enrolledCount: number;
  waitlistedCount: number;
  remaining: number;
  isFull: boolean;
  canWaitlist: boolean;
}

export default function PublicClassesClient({
  tenant,
  orgName,
  classes,
  enrolledClassName,
  wasCanceled,
}: {
  tenant: string;
  orgName: string;
  classes: PublicClassItem[];
  enrolledClassName?: string | null;
  wasCanceled?: boolean;
}) {
  const [selected, setSelected] = useState<PublicClassItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"location" | "day" | "name">("location");
  const [studentName, setStudentName] = useState("");

  const locations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of classes) {
      const loc = (c.location || c.roomName || "Location TBA").trim();
      counts.set(loc, (counts.get(loc) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const c of classes) {
      if (c.day && c.day !== "Schedule TBA") set.add(c.day);
    }
    return Array.from(set).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classes
      .filter((c) => {
        const loc = (c.location || c.roomName || "Location TBA").trim();
        if (selectedLocation !== "all" && loc !== selectedLocation) return false;
        if (selectedDay !== "all" && c.day !== selectedDay) return false;
        if (
          q &&
          !c.className.toLowerCase().includes(q) &&
          !c.teacherName.toLowerCase().includes(q) &&
          !loc.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "location") {
          const la = (a.location || a.roomName || "").localeCompare(b.location || b.roomName || "");
          return la !== 0 ? la : a.className.localeCompare(b.className);
        }
        if (sortBy === "day") {
          const da = (a.day || "").localeCompare(b.day || "");
          return da !== 0 ? da : a.className.localeCompare(b.className);
        }
        return a.className.localeCompare(b.className);
      });
  }, [classes, selectedLocation, selectedDay, searchQuery, sortBy]);
  const [studentEmail, setStudentEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instantResult, setInstantResult] = useState<{
    status: string;
    className: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/classes/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          classId: selected.id,
          studentName,
          studentEmail,
          parentEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to complete registration.");
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setInstantResult({
        status: data.status || "enrolled",
        className: data.className || selected.className,
      });
      setSelected(null);
      setStudentName("");
      setStudentEmail("");
      setParentEmail("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <header className="space-y-2 border-b border-white/10 pb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
            {orgName} • Theater Academy
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-500 shrink-0" size={36} />
            Classes & Workshops
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Browse upcoming acting, vocal, dance, and technical theater classes. Register online
            with instant seat confirmation or join the waitlist when a class reaches capacity.
          </p>
        </header>

        {enrolledClassName && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0" />
            Registration & tuition payment confirmed for <strong>{enrolledClassName}</strong>!
          </div>
        )}

        {instantResult && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2.5">
            <CheckCircle2 size={18} className="shrink-0" />
            {instantResult.status === "waitlisted"
              ? `Added to the waitlist for ${instantResult.className}. We will notify you as soon as a spot opens.`
              : `Enrollment confirmed for ${instantResult.className}!`}
          </div>
        )}

        {wasCanceled && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            Checkout was canceled — no tuition was charged.
          </div>
        )}

        {classes.length > 0 && (
          <section className="space-y-4 bg-zinc-900/70 border border-white/10 rounded-3xl p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search classes, teachers, or church locations..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {days.length > 1 && (
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    aria-label="Filter by day"
                    className="px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-bold text-zinc-200"
                  >
                    <option value="all">All Days</option>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "location" | "day" | "name")}
                  aria-label="Sort classes"
                  className="px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-bold text-zinc-200"
                >
                  <option value="location">Sort: By Church / Location</option>
                  <option value="day">Sort: By Day</option>
                  <option value="name">Sort: By Class Name</option>
                </select>
              </div>
            </div>

            {locations.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1">
                  <MapPin size={12} /> Location:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLocation("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedLocation === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-950 text-zinc-300 border border-white/10 hover:border-white/25"
                  }`}
                >
                  All Locations ({classes.length})
                </button>
                {locations.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => setSelectedLocation(loc.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedLocation === loc.name
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-950 text-zinc-300 border border-white/10 hover:border-white/25"
                    }`}
                  >
                    {loc.name} ({loc.count})
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {classes.length === 0 ? (
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-12 text-center space-y-3">
            <BookOpen size={44} className="mx-auto text-zinc-600" />
            <h2 className="text-xl font-black text-white">No Open Classes Right Now</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Check back soon for the next academy session from {orgName}.
            </p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 text-center space-y-3">
            <p className="text-sm text-zinc-400">No classes match your current location or search filters.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedLocation("all");
                setSelectedDay("all");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls) => {
              const priceLabel =
                cls.tuitionCents > 0 ? `$${(cls.tuitionCents / 100).toFixed(2)}` : "Free";
              const ageLabel =
                cls.minAge || cls.maxAge
                  ? `Ages ${cls.minAge ?? "Any"}–${cls.maxAge ?? "All"}`
                  : "All Ages";

              return (
                <article
                  key={cls.id}
                  className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                        {cls.type}
                      </span>
                      <span className="text-lg font-black text-white font-mono">
                        {priceLabel}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-white leading-snug">
                        {cls.className}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                        <User size={12} className="text-zinc-500" />
                        {cls.teacherName} • {ageLabel}
                      </p>
                    </div>

                    {cls.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {cls.description}
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1 text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-blue-400 shrink-0" />
                        <span>{cls.day}</span>
                        {cls.timeSlot && (
                          <>
                            <Clock size={13} className="text-zinc-500 ml-2 shrink-0" />
                            <span>{cls.timeSlot}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <MapPin size={13} className="text-zinc-500 shrink-0" />
                        <span>{cls.roomName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      {cls.isFull ? (
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <Users size={13} /> Class Full ({cls.waitlistedCount} waitlisted)
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <Users size={13} /> {cls.remaining} of {cls.capacity} spots left
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={cls.isFull && !cls.canWaitlist}
                      onClick={() => {
                        setSelected(cls);
                        setError(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        cls.isFull
                          ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      } disabled:opacity-40`}
                    >
                      {cls.isFull ? "Join Waitlist" : "Register"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  {selected.isFull ? "Join Class Waitlist" : "Class Registration"}
                </p>
                <h3 className="text-lg font-black text-white mt-0.5">{selected.className}</h3>
                <p className="text-xs text-zinc-400">
                  {selected.day} {selected.timeSlot ? `• ${selected.timeSlot}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Student Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Student or Family Email *
                </label>
                <input
                  required
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Parent / Billing Email (Optional)
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CreditCard size={15} />
              )}
              {selected.isFull
                ? "Join Waitlist (No Charge)"
                : selected.tuitionCents > 0
                  ? `Pay $${(selected.tuitionCents / 100).toFixed(2)} & Enroll`
                  : "Confirm Free Enrollment"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
