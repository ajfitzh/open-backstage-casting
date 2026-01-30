import { getClassById, getClassRoster } from "@/app/lib/baserow";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone, Calendar, Clock, MapPin, Users, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClassDetailsPage({ params }: { params: { id: string } }) {
  const [cls, roster] = await Promise.all([
    getClassById(params.id),
    getClassRoster(params.id)
  ]);

  if (!cls) notFound();

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="p-8 border-b border-white/5 bg-zinc-900/30">
        <Link href="/education" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-xs font-bold uppercase tracking-widest transition-colors">
            <ChevronLeft size={14} /> Back to Academy
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
                <div className="flex gap-2 mb-3">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {cls.session}
                    </span>
                    {cls.spaceName && (
                        <span className="bg-zinc-800 text-zinc-400 border border-white/5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {cls.spaceName}
                        </span>
                    )}
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{cls.name}</h1>
                <p className="text-zinc-400 font-medium text-lg flex items-center gap-2">
                    Instructor: <span className="text-white border-b border-white/10 pb-0.5">{cls.teacher}</span>
                </p>
            </div>

            <div className="flex gap-3">
                <Link href={`/education/class/${params.id}/attendance`} className="bg-zinc-100 hover:bg-white text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-xl shadow-white/5">
                    Take Attendance
                </Link>
            </div>
        </div>

        {/* METADATA GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <MetaCard icon={<Calendar size={16}/>} label="Day" value={cls.day} />
            <MetaCard icon={<Clock size={16}/>} label="Time" value={cls.time} />
            <MetaCard icon={<MapPin size={16}/>} label="Location" value={cls.location} />
            <MetaCard icon={<Users size={16}/>} label="Roster" value={`${roster.length} Students`} highlight />
        </div>
      </div>

      {/* ROSTER LIST */}
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
            <Users className="text-purple-500" /> Class Roster
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roster.length > 0 ? roster.map((student: any) => (
                <div key={student.id} className="group bg-zinc-900/50 border border-white/5 p-5 rounded-2xl hover:border-purple-500/30 hover:bg-zinc-900 transition-all flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/5">
                                {student.photo ? (
                                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-zinc-500">{student.name.substring(0,2).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-white leading-tight">{student.name}</h3>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Age: {student.age || 'N/A'}</p>
                            </div>
                        </div>
                        {student.medical !== "None" && (
                            <div className="text-red-500 bg-red-500/10 p-2 rounded-lg" title={student.medical}>
                                <Info size={16} />
                            </div>
                        )}
                    </div>

                    <div className="mt-auto space-y-2 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <Mail size={12} className="text-zinc-600" />
                            <span className="truncate">{student.email || "No Email"}</span>
                        </div>
                        {student.phone && (
                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                                <Phone size={12} className="text-zinc-600" />
                                <span>{student.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            )) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                    <p className="text-zinc-500 font-bold">No students found in this roster.</p>
                    <p className="text-zinc-600 text-xs mt-1">Check that students are linked in the Baserow "Classes" table.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ icon, label, value, highlight }: any) {
    return (
        <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${highlight ? 'bg-purple-500/10 text-purple-500' : 'bg-zinc-900 text-zinc-500'}`}>
                {icon}
            </div>
            <div>
                <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">{label}</div>
                <div className="font-bold text-white text-sm truncate max-w-[120px]" title={value}>{value}</div>
            </div>
        </div>
    )
}