import './globals.css';

export const metadata = {
  title: 'Open Backstage',
  description: 'CYT Production Hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      {/* We set h-screen here on the body so it applies to EVERYTHING.
         The Login Page will use this directly.
         The Main App will fill this container via its own layout.
      */}
      <body className="bg-zinc-950 text-zinc-100 h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}