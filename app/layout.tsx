import './globals.css';

export const metadata = {
  title: 'Open Backstage',
  description: 'CYT Production Hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      {/* This is the "Naked" layout. 
        It provides CSS and HTML structure, but NO UI elements.
        This allows the Login page to take over the full screen.
      */}
      <body className="bg-zinc-950 text-zinc-100 h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}