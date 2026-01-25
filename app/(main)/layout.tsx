import GlobalHeader from '@/app/components/globalappheader/globalappheader';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* The One Menu */}
      <GlobalHeader /> 
      
      {/* Full Page Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}