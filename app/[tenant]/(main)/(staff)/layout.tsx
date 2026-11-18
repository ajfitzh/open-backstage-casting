

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaffRole } from "@/app/lib/permissions";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role || "Guest";
  if (!isStaffRole(userRole)) {
    redirect("/");
  }

  return (
    <div className="flex h-full w-full"> {/* CHANGED: h-screen -> h-full */}
      <main className="flex-1 overflow-auto bg-zinc-900/50 relative">
        {children}
      </main>
    </div>
  );
}