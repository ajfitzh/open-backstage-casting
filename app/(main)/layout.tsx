import GlobalHeader from '@/app/components/globalappheader/globalappheader';
import StaffSidebar from '@/app/components/StaffSidebar'; // Move this component up to be global

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* 1. PERSISTENT SIDEBAR (Left) */}
      {/* Hidden on mobile, visible on desktop */}
      <div className="hidden md:block h-full shrink-0">
        <StaffSidebar /> 
      </div>

      {/* 2. MAIN CONTENT AREA (Right) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Context Switcher & User Profile) */}
        <GlobalHeader />
        
        {/* The Page Content (Scrollable) */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}