import StaffSidebar from '@/app/components/StaffSidebar'; 

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full"> {/* CHANGED: h-screen -> h-full */}
      <StaffSidebar /> 
      <main className="flex-1 overflow-auto bg-zinc-900/50 relative">
        {children}
      </main>
    </div>
  );
}