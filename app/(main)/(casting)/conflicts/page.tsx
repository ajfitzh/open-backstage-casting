// app/(production)/conflicts/page.tsx
import { 
  getActiveProduction, 
  getProductionConflicts, 
  getProductionEvents 
} from "@/app/lib/baserow"; // Ensure getProductionEvents is imported
import ConflictsClient from "@/app/components/conflicts/ConflictsClient";

export default async function ConflictsPage() {
  const production = await getActiveProduction();

  if (!production) {
    return <div className="p-10 text-zinc-500">No active production found.</div>;
  }

  // Fetch Conflicts AND Events
  const [conflicts, events] = await Promise.all([
    getProductionConflicts(production.id),
    getProductionEvents(production.id) // We need to add this helper in step 3
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <ConflictsClient 
        production={production} 
        initialConflicts={conflicts} 
        initialEvents={events} // Pass events down
      />
    </main>
  );
}