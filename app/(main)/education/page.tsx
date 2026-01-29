import { getClasses } from "@/app/lib/baserow";
import AcademyClient from "./academy-client";
import { GraduationCap, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EducationPage() {
  // 1. Fetch the real data from Baserow
  const classes = await getClasses();

  // 2. Calculate Header Stats
  const totalStudents = classes.reduce((acc, c) => acc + c.students, 0);
  const totalClasses = classes.length;
  // Get unique teachers count
  const uniqueTeachers = new Set(classes.map(c => c.teacher)).size;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* HEADER SECTION */}
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
               Enrollment tracking and faculty performance metrics.
             </p>
          </div>

          {/* KPI CARDS */}
          <div className="flex gap-4">
             <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Total Enrollment</p>
                <div className="flex items-center gap-2 text-2xl font-black text-white italic">
                   <Users size={20} className="text-blue-500" />
                   {totalStudents}
                </div>
             </div>
             <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Active Faculty</p>
                <p className="text-2xl font-black text-blue-500 italic">{uniqueTeachers}</p>
             </div>
          </div>
        </div>
      </div>

      {/* RENDER THE NEW DASHBOARD */}
      <div className="flex-1 overflow-hidden">
        <AcademyClient classes={classes} />
      </div>
    </div>
  );
}