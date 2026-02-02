import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTeacherClasses, getOpenBounties } from "@/app/lib/baserow";
import TeacherPortalClient from "@/app/components/education/TeacherPortalClient";

export const dynamic = "force-dynamic";

export default async function TeacherPortalPage() {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    // 1. Identify the Teacher (Using Name for now, eventually link to People ID)
    const teacherName = session.user.name || "Unknown Teacher";

    // 2. Fetch Data
    const [myClasses, bounties] = await Promise.all([
        getTeacherClasses(teacherName),
        getOpenBounties()
    ]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white overflow-y-auto custom-scrollbar">
            <header className="p-8 border-b border-white/5 bg-zinc-900/30 shrink-0">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">Faculty Portal</h1>
                    <p className="text-zinc-400 mt-1">Welcome back, <span className="text-white font-bold">{teacherName}</span>.</p>
                </div>
            </header>

            <main className="p-8 max-w-5xl mx-auto w-full pb-24">
                <TeacherPortalClient 
                    teacherName={teacherName} 
                    history={myClasses} 
                    bounties={bounties} 
                    currentSession="Fall 2026" // You could make this dynamic later
                />
            </main>
        </div>
    );
}