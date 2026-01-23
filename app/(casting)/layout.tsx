import CastingSidebar from '@/components/CastingSidebar'; // The one you already have

export default function CastingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <CastingSidebar /> 
      <main className="flex-1 overflow-auto bg-zinc-900/50">
        {children}
      </main>
    </div>
  );
}