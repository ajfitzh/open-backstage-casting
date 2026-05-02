import { BaserowClient } from "@/app/lib/BaserowClient";
import HiringKanban from "@/app/components/education/HiringKanban";

export const dynamic = "force-dynamic";

// 🟢 1. Add params to the page signature
export default async function HiringPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;

  // 🟢 3. Pass the tenant string to the fetcher
  const applicants = await BaserowClient.getTeacherApplicants(tenant);

  return <HiringKanban applicants={applicants} />;
}