// app/[tenant]/(main)/production/[id]/check-in/page.tsx
import { getShowById, getAuditionees } from "@/app/lib/baserow";
import CheckInBoard from "./CheckInBoard";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: { tenant: string, id: string } }) {
  const tenant = params.tenant;
  const productionId = parseInt(params.id);

  const [show, rawAuditions] = await Promise.all([
    getShowById(tenant, productionId),
    // 🟢 FIX 1: Added 'tenant' as the first argument
    getAuditionees(tenant, productionId).catch(() => [])
  ]);

  const parseAdminNotes = (notes: string) => {
    const parsed = { status: "Pending", lobbyNote: "" };
    if (!notes) return parsed;
    
    const statusMatch = notes.match(/STATUS:\s*(.+)/);
    if (statusMatch) parsed.status = statusMatch[1].trim();
    
    const lobbyMatch = notes.match(/LOBBY:\s*(.+)/);
    if (lobbyMatch) parsed.lobbyNote = lobbyMatch[1].trim();
    
    return parsed;
  };

  const cast = Array.isArray(rawAuditions) ? rawAuditions.map((a: any) => {
    // 🟢 FIX 2: Used (a as any) so TypeScript stops complaining about missing types
    const parsed = parseAdminNotes((a as any).adminNotes);
    const dateObj = a.date ? new Date(a.date) : null;

    return {
      id: a.id.toString(), 
      name: a.name || "Walk-In",
      role: a.song || "No Song Selected",
      avatar: a.headshot || `https://ui-avatars.com/api/?name=${a.name || 'W'}&background=random`,
      status: parsed.status,
      timeSlot: dateObj ? dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "Walk-In",
      auditionDay: dateObj ? dateObj.toLocaleDateString([], { weekday: 'long' }) : "Walk-In",
      lobbyNote: parsed.lobbyNote,
      conflicts: a.conflicts || "",
      isFirstShow: false, 
      showHistory: [], 
      auditionPrep: { monologue: a.monologue || "N/A", songTitle: a.song || "N/A", musicProvided: !!a.video },
      missingForms: [], 
      family: { parents: ["View in Dashboard"], siblings: [] },
      phone: "View in Dashboard",
      email: "View in Dashboard"
    };
  }) : [];

  return (
    <CheckInBoard 
      tenant={tenant} 
      productionTitle={show?.title || "Production"} 
      initialCast={cast} 
    />
  );
}