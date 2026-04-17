import { cookies } from 'next/headers';
import { getSeasonBoard } from "@/app/lib/actions";
import SeasonBoard from "./SeasonBoard"; 
import { DB } from "@/app/lib/schema";

const safeMap = (field: any) => {
  if (!field || !Array.isArray(field)) return [];
  return field.map((item: any) => item.value);
};

export default async function SeasonPlannerPage() {
  const cookieStore = await cookies();
  const seasonId = cookieStore.get('active_season_id')?.value || "1"; 

  const boardData = await getSeasonBoard(seasonId);

  if (!boardData || !boardData.season) {
    return (
      <div className="p-12 text-center text-slate-400">
        <h2 className="text-xl font-bold text-white">Season Not Found</h2>
        <p>Could not load season data. Please check your database connection.</p>
      </div>
    );
  }

  const formattedTalent = boardData.talentPool.map((row: any) => ({
    id: row.id,
    name: row[DB.STAFF_INTEREST.FIELDS.NAME] || "Unknown",
    roles: safeMap(row[DB.STAFF_INTEREST.FIELDS.ROLE_PREFERENCES]), 
    availability_json: JSON.parse(row[DB.STAFF_INTEREST.FIELDS.AVAILABILITY_JSON] || "{}"),
    constraints: (row[DB.STAFF_INTEREST.FIELDS.CONSTRAINTS] || "").split(",").filter(Boolean),
  }));

  const formattedSlots = boardData.productions.map((row: any) => ({
    id: row.id,
    title: row[DB.PRODUCTIONS.FIELDS.TITLE] || "Untitled Slot",
    status: row[DB.PRODUCTIONS.FIELDS.STATUS]?.value || "Pending",
    filledBy: null 
  }));

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-3">
            <span className="text-blue-500">SEASON {boardData.season.id}</span>
            <span className="text-slate-600">/</span>
            <span>WAR ROOM</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Drag staff from the talent pool into production slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
             {formattedTalent.length} Applicants
           </span>
        </div>
      </header>

      <SeasonBoard 
        initialTalent={formattedTalent} 
        initialSlots={formattedSlots} 
        seasonId={seasonId}
      />
    </div>
  );
}