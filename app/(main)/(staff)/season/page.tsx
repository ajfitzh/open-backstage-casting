// app/admin/season/[seasonId]/page.tsx
import { getSeasonBoard } from "@/app/lib/actions"; // Assuming you put that fetcher here
import SeasonBoard from "./SeasonBoard";

export default async function SeasonPlannerPage({ params }: { params: { seasonId: string } }) {
  // 1. Fetch Raw Data
  const data = await getSeasonBoard(params.seasonId);

  // 2. Transform Raw Baserow Data -> UI Format
  // We need to map the complex Baserow objects into our clean Types
  
  const talentPool = data.talentPool.map((row: any) => ({
    id: row.id,
    name: row.field_6253, // Name
    roles: row.field_6259.map((r: any) => r.value), // Linked Roles
    availability_json: JSON.parse(row.field_6258 || "{}"), 
    constraints: (row.field_6261 || "").split(","), // Assuming CSV string for constraints
  }));

  const productions = data.productions.map((prod: any) => {
    // Logic: Decide which slots exist based on "Staffing Tier"
    // Ideally this comes from the Linked Show, but we'll mock logic for now:
    const showTier = prod.linked_show_tier || "Standard"; 
    
    const standardSlots = ["Director", "Music Director", "Choreographer", "Stage Manager"];
    if (showTier === "Tech-Heavy") standardSlots.push("Flight Director", "Projections");
    
    return {
      id: prod.id.toString(),
      title: prod.field_5743, // Internal Name (Winter Main Stage)
      showTitle: prod.field_5769?.[0]?.value || "TBD", // Linked Show Title
      slots: standardSlots.map(role => ({
        id: `${prod.id}-${role}`,
        role: role,
        filledBy: null, // We'd need to fetch assignments to populate this real-time
        seasonSession: "Winter" // Determine from prod date or field
      }))
    };
  });

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Season Planner: {data.season.field_6244}</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-100 rounded hover:bg-slate-200">Save Draft</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Publish Offers</button>
        </div>
      </header>
      
      <SeasonBoard 
        initialTalentPool={talentPool} 
        initialProductions={productions} 
      />
    </div>
  );
}