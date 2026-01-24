import GlobalHeader from '@/app/components/globalheader'; 

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full"> 
      
      {/* The Header now lives ONLY here, inside (main) */}
      <GlobalHeader />

      <div className="flex-1 flex overflow-hidden relative">
          {children}
      </div>

    </div>
  );
}