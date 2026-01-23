import GlobalHeader from '@/components/GlobalHeader'; // Import it
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 flex flex-col h-screen overflow-hidden">
        
        {/* The Top Bar - Always visible */}
        <GlobalHeader />

        {/* The "Page Body" - This is where your Route Groups (Sidebars) will load */}
        <div className="flex-1 flex overflow-hidden">
            {children}
        </div>

      </body>
    </html>
  );
}