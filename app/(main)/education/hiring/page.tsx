import { BaserowClient } from "@/app/lib/BaserowClient";
import HiringKanban from "@/app/components/education/HiringKanban";

export const dynamic = "force-dynamic";

export default async function HiringPage() {
  // Use the clean client
  const applicants = await BaserowClient.getTeacherApplicants();

  return <HiringKanban applicants={applicants} />;
}
