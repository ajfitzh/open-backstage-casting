import { getClasses, getVenueLogistics } from "@/app/lib/baserow";
import AcademyClient from "./academy-client";
import { GraduationCap, Users, Map } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EducationPage() {
  // 1. Fetch Data in Parallel
  const [classes, venues] = await Promise.all([
    getClasses(),
    getVenueLogistics()
  ]);

  // 2. Header Stats
  const totalStudents = classes.reduce((acc, c) => acc + c.students, 0);
  const uniqueTeachers = new Set(classes.map(c => c.teacher)).size;
  const totalRooms = venues.reduce((acc, v) => acc + v.spaces.length, 0);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* HEADER */}
      <div className="p-8 border-b border-white/5 bg-zinc-900/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">
               <GraduationCap size={14} /> CYT Academy
             </div>
             <h1 className="text-4xl font-black text-white tracking-tighter italic">
               CLASS <span className="text-blue-500">MANAGER</span>
             </h1>
             <p className="text-zinc-500 text-xs font-medium max-w-md uppercase tracking-wide">
               Enrollment tracking, faculty performance, and campus logistics.
             </p>
          </div>

          <div className="flex gap-4">
             <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Total Enrollment</p>
                <div className="flex items-center gap-2 text-2xl font-black text-white italic">
                   <Users size={20} className="text-blue-500" />
                   {totalStudents}
                </div>
             </div>
             <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Active Venues</p>
                <div className="flex items-center gap-2 text-2xl font-black text-purple-500 italic">
                   <Map size={20} />
                   {venues.length} <span className="text-xs text-zinc-600 not-italic font-bold">({totalRooms} Rms)</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="flex-1 overflow-hidden">
        <AcademyClient classes={classes} venues={venues} />
      </div>
    </div>
  );
}