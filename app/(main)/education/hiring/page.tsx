import { getTeacherApplicants } from "@/app/lib/baserow";
import HiringKanban from "@/app/components/education/HiringKanban";

export const dynamic = "force-dynamic";

export default async function HiringPage() {
  const applicants = await getTeacherApplicants();
  return <HiringKanban applicants={applicants} />;
}