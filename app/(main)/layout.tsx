import GlobalHeader from '@/app/components/GlobalHeader'; 

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full"> {/* Matches the parent h-screen */}
      
      {/* The Top Bar - Only visible inside the App */}
      <GlobalHeader />

      {/* The Page Content */}
      <div className="flex-1 flex overflow-hidden">
          {children}
      </div>

    </div>
  );
}