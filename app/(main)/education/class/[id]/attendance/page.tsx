import { getClassById } from "@/lib/baserow";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ params }: { params: { id: string } }) {
  const cls = await getClassById(params.id);

  if (!cls) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white p-8">
      {/* Back to Class Dashboard (Not main menu) */}
      <Link 
        href={`/education/class/${params.id}`} 
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 text-xs font-bold uppercase tracking-widest transition-colors w-fit"
      >
        <ChevronLeft size={16} /> Back to Class Dashboard
      </Link>

      <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl border-l-4 border-l-blue-500">
        <div className="flex items-center gap-4 mb-6">
           <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <ClipboardList size={24} />
           </div>
           <div>
              <h1 className="text-2xl font-black text-white">Attendance Record</h1>
              <p className="text-zinc-400 text-sm">for {cls.name}</p>
           </div>
        </div>

        {/* Placeholder Content */}
        <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl text-center">
            <p className="text-zinc-500 font-bold">Attendance Sheet Placeholder</p>
            <p className="text-zinc-600 text-xs mt-1">This page now exists! The 404 error is gone.</p>
        </div>
      </div>
    </div>
  );
}