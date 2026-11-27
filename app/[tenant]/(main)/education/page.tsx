import { BaserowClient } from "@/app/lib/BaserowClient";
import { isPostgresEnabled } from "@/db";
import { getAcademyAdminOptionsPg } from "@/app/lib/db/admin-crud-repo";
import EducationGrid from "./EducationGrid";

export const dynamic = "force-dynamic";

export default async function EducationPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  const [classes, adminOptions] = await Promise.all([
    BaserowClient.getAllClasses(tenant),
    isPostgresEnabled()
      ? getAcademyAdminOptionsPg(tenant).catch(() => ({
          sessions: [],
          teachers: [],
          allPeople: [],
          spaces: [],
        }))
      : Promise.resolve({ sessions: [], teachers: [], allPeople: [], spaces: [] }),
  ]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      <div className="p-8 border-b border-white/5 bg-zinc-900/30 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Academy Manager</h1>
          <p className="text-zinc-400">
            Create classes, swap teachers, manage student enrollments, and take attendance.
          </p>
        </div>
        <a
          href="/classes"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider"
        >
          Public Class Catalog &rarr;
        </a>
      </div>
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <EducationGrid tenant={tenant} classes={classes} adminOptions={adminOptions} />
      </div>
    </div>
  );
}
