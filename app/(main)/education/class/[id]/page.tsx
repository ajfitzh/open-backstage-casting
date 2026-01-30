import { getClassById } from "@/app/lib/baserow"; // We will add this function next
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, Calendar, MapPin, Clock } from "lucide-react";

// This tells Next.js this page is dynamic and needs to be rendered on demand
export const dynamic = "force-dynamic";

export default async function ClassDetailsPage({ params }: { params: { id: string } }) {
  // 1. Fetch the specific class data using the ID from the URL
  const cls = await getClassById(params.id);

  // 2. If Baserow returns null (ID doesn't exist), show the 404 page
  if (!cls) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white p-8 overflow-y-auto">
      {/* Navigation */}
      <Link 
        href="/education" 
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 text-xs font-bold uppercase tracking-widest transition-colors w-fit"
      >
        <ChevronLeft size={16} /> Back to Class Manager
      </Link>

      {/* Main Card */}
      <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2rem] max-w-4xl">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                    {cls.session}
                </span>
                <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                    {cls.name}
                </h1>
                <p className="text-zinc-400 text-lg font-medium">
                    Instructor: <span className="text-zinc-200">{cls.teacher}</span>
                </p>
            </div>
            
            {/* Enrollment Badge */}
            <div className="bg-zinc-950 border border-white/5 px-6 py-4 rounded-2xl text-center">
                <div className="text-3xl font-black text-emerald-500">{cls.students}</div>
                <div className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">Enrolled</div>
            </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-white/5">
            <DetailItem icon={<Calendar size={16}/>} label="Day" value={cls.day} />
            <DetailItem icon={<Clock size={16}/>} label="Time" value={cls.time} />
            <DetailItem icon={<MapPin size={16}/>} label="Location" value={cls.location} />
            <DetailItem icon={<Users size={16}/>} label="Age Range" value={cls.ageRange} />
        </div>
      </div>
    </div>
  );
}

// Simple helper component for the grid items
function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                {icon} <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="font-bold text-zinc-200">{value}</div>
        </div>
    )
}