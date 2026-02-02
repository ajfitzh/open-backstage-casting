import { getSeasonBoard } from "@/app/lib/actions";
import SeasonBoard from "./SeasonBoard"; // Your client component
import { DB } from "@/app/lib/schema";

// Helper to safely extract linked values
const safeMap = (field: any) => {
  if (!field || !Array.isArray(field)) return [];
  return field.map((item: any) => item.value);
};

export default async function SeasonPlannerPage() {
  // 1. Get the current active season ID
  // For now, we'll just grab the first one or hardcode a specific ID if you have one.
  // Ideally, this comes from a param or the active production cookie.
  // Let's assume we are looking for Season 1 (or replace "1" with your actual Season ID)
  const seasonId = "1"; 

  const boardData = await getSeasonBoard(seasonId);

  if (!boardData || !boardData.season) {
    return (
      <div className="p-12 text-center text-slate-400">
        <h2 className="text-xl font-bold text-white">Season Not Found</h2>
        <p>Could not load season data. Please check your database connection.</p>
      </div>
    );
  }

  // 2. Transform the raw Baserow data into the shape your Client Component needs
  // We use the DB schema keys to make it readable
  const formattedTalent = boardData.talentPool.map((row: any) => ({
    id: row.id,
    name: row[DB.STAFF_INTEREST.FIELDS.NAME] || "Unknown",
    // FIX: Safely map the roles using the helper
    roles: safeMap(row[DB.STAFF_INTEREST.FIELDS.ROLE_PREFERENCES]), 
    availability_json: JSON.parse(row[DB.STAFF_INTEREST.FIELDS.AVAILABILITY_JSON] || "{}"),
    // FIX: Safely split string, checking if it exists first
    constraints: (row[DB.STAFF_INTEREST.FIELDS.CONSTRAINTS] || "").split(",").filter(Boolean),
  }));

  const formattedSlots = boardData.productions.map((row: any) => ({
    id: row.id,
    title: row[DB.PRODUCTIONS.FIELDS.TITLE] || "Untitled Slot",
    status: row[DB.PRODUCTIONS.FIELDS.STATUS]?.value || "Pending",
    // If you have a 'Filled By' field for the director, map it here. 
    // Otherwise leave it null for drag-and-drop.
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

      {/* 3. Pass safe data to the Client Component */}
      <SeasonBoard 
        initialTalent={formattedTalent} 
        initialSlots={formattedSlots} 
        seasonId={seasonId}
      />
    </div>
  );
}