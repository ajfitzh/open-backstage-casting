import StaffSidebar from '../components/StaffSidebar'; // A NEW, simpler sidebar

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <StaffSidebar /> {/* Contains only: Committees, Roster, Attendance */}
      <main className="flex-1 overflow-auto bg-zinc-900/50">
        {children}
      </main>
    </div>
  );
}