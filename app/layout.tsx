import './globals.css';

export const metadata = {
  title: 'Open Backstage',
  description: 'CYT Production Hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      {/* 1. suppressHydrationWarning: Keeps extensions like ColorZilla happy.
        2. NO Header here: This ensures the Login page gets the full, empty screen.
      */}
      <body 
        className="bg-zinc-950 text-zinc-100 h-screen w-screen overflow-hidden"
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}