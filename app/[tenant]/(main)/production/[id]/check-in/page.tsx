import { getShowById } from "@/app/lib/baserow";
import CheckInBoard from "./CheckInBoard";

export default async function CheckInPage({ params }: { params: { tenant: string, id: string } }) {
  // We grab the show details on the server so the board 
  // knows exactly which production it is checking in for.
  const show = await getShowById(params.tenant, parseInt(params.id));
  
  return (
    <CheckInBoard productionTitle={show?.title || "Production"} />
  );
}