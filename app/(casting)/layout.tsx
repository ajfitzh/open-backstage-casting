import CastingSidebar from '@/app/components/CastingSidebar'; // Updated import

export default function CastingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full"> {/* CHANGED: h-screen -> h-full */}
      <CastingSidebar /> 
      <main className="flex-1 overflow-auto bg-zinc-900/50 relative">
        {children}
      </main>
    </div>
  );
}