import { getClasses } from "@/app/lib/baserow";
import EducationGrid from "./EducationGrid"; // We will make this component below

export const dynamic = "force-dynamic";

export default async function EducationPage() {
  const classes = await getClasses();

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      <div className="p-8 border-b border-white/5 bg-zinc-900/30 shrink-0">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Academy Manager</h1>
        <p className="text-zinc-400">Manage rosters, attendance, and enrollment.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         {/* Pass data to Client Component to handle Modals */}
         <EducationGrid classes={classes} />
      </div>
    </div>
  );
}