// app/[tenant]/classes/page.tsx
// Public Academy Class Catalog & Registration (with Stripe Tuition Checkout + Waitlist).

import { isPostgresEnabled } from "@/db";
import { listPublicClassesPg } from "@/app/lib/db/phase3-repo";
import PublicClassesClient from "@/app/components/education/PublicClassesClient";

export const dynamic = "force-dynamic";

export default async function PublicClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
  searchParams?: Promise<{ enrolled?: string; class?: string; canceled?: string }>;
}) {
  const { tenant } = await params;
  const sp = searchParams ? await searchParams : {};

  if (!isPostgresEnabled()) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8">
        Academy registration requires PostgreSQL.
      </div>
    );
  }

  const data = await listPublicClassesPg(tenant);
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8">
        Organization not found.
      </div>
    );
  }

  return (
    <PublicClassesClient
      tenant={tenant}
      orgName={data.org.name}
      classes={data.classes}
      enrolledClassName={sp?.enrolled === "1" ? sp.class || "your class" : null}
      wasCanceled={sp?.canceled === "1"}
    />
  );
}
