import { CastingProvider } from '@/lib/CastingContext';
import Sidebar from './components/Sidebar'; // Import the component we just made
import './globals.css';

export const metadata = {
  title: 'Open Backstage Casting',
  description: 'Production Management Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body 
        className="bg-zinc-950 text-zinc-100 flex h-screen overflow-hidden" 
        suppressHydrationWarning={true}
      >
        <CastingProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto bg-zinc-900/50">
            {children}
          </main>
        </CastingProvider>
      </body>
    </html>
  );
}