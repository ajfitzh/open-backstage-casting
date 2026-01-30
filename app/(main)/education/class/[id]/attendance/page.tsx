import { getClassById, getClassRoster } from "@/app/lib/baserow";
import AttendanceSheet from "@/app/components/education/AttendanceSheet";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ params }: { params: { id: string } }) {
  const [cls, roster] = await Promise.all([
    getClassById(params.id),
    getClassRoster(params.id)
  ]);

  if (!cls) notFound();

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white p-8 overflow-y-auto">
      <Link href={`/education/class/${params.id}`} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 text-xs font-bold uppercase tracking-widest transition-colors w-fit">
        <ChevronLeft size={16} /> Back to {cls.name}
      </Link>

      <div className="flex flex-col xl:flex-row gap-8 max-w-6xl mx-auto w-full">
        {/* Sidebar Info */}
        <div className="xl:w-64 space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">Attendance</h1>
                <p className="text-zinc-400 text-sm font-medium">{cls.name}</p>
            </div>

            <div className="bg-zinc-900 border border-white/5 p-5 rounded-3xl space-y-4">
                <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Date</div>
                    <div className="flex items-center gap-2 text-white font-bold bg-zinc-950 p-3 rounded-xl border border-white/5">
                        <Calendar size={16} className="text-blue-500" />
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Session</div>
                    <div className="text-zinc-300 font-medium pl-1">{cls.session}</div>
                </div>
            </div>
        </div>

        {/* Interactive Sheet */}
        <div className="flex-1">
            <AttendanceSheet students={roster} />
        </div>
      </div>
    </div>
  );
}