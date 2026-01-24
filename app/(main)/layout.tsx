import GlobalHeader from '@/app/components/GlobalHeader'; 

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full"> 
      
      {/* 1. The Header (Top Bar) */}
      <GlobalHeader />

      {/* 2. The Content Area (Fills remaining space) */}
      <div className="flex-1 flex overflow-hidden relative">
          {children}
      </div>

    </div>
  );
}