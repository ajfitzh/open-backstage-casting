"use client";

import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  User, 
  DollarSign, 
  FileText, 
  Camera, 
  Ruler 
} from 'lucide-react';

interface Student {
  id: string | number;
  performerName: string;
  signedAgreement: boolean;
  paidFees: boolean;
  headshotSubmitted: boolean;
  measurementsTaken: boolean;
}

// FIX: Default 'students' to an empty array to prevent crashes
const ComplianceDashboard = ({ students = [] }: { students?: Student[] }) => {
  
  // 1. Safety Check: If no students exist, show a helpful message instead of an empty table
  if (!students || students.length === 0) {
    return (
      <div className="bg-zinc-950 text-zinc-50 p-6 min-h-screen flex flex-col items-center justify-center">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Staff Portal: Compliance & Onboarding</h1>
          <p className="text-zinc-400">Production: Winter 2026</p>
        </header>
        <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-900/50">
          <User className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Cast Members Found</h3>
          <p className="text-sm mt-2 max-w-sm">
            We couldn&apos;t find any cast members for this show. Ensure you have assigned roles in the Assignments table and that those students have an Audition record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-zinc-50 p-6 min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Staff Portal: Compliance & Onboarding</h1>
        <p className="text-zinc-400">Production: Winter 2026</p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Performer</th>
              <th className="px-4 py-3 text-center">Agreement</th>
              <th className="px-4 py-3 text-center">Fees</th>
              <th className="px-4 py-3 text-center">Headshot</th>
              <th className="px-4 py-3 text-center">Measurements</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-4 py-4 font-medium flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <User size={16} />
                  </div>
                  {/* Fallback text if name is missing */}
                  <span className="text-zinc-200">
                    {student.performerName || "Unknown Performer"}
                  </span>
                </td>
                
                {/* Compliance Checkboxes */}
                <ComplianceCell checked={student.signedAgreement} icon={<FileText size={16}/>} />
                <ComplianceCell checked={student.paidFees} icon={<DollarSign size={16}/>} />
                <ComplianceCell checked={student.headshotSubmitted} icon={<Camera size={16}/>} />
                <ComplianceCell checked={student.measurementsTaken} icon={<Ruler size={16}/>} />

                <td className="px-4 py-4 text-right">
                  <button className="text-zinc-400 hover:text-white text-xs bg-zinc-800 px-3 py-1 rounded transition-colors">
                    Edit Row
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ComplianceCell = ({ checked, icon }: { checked: boolean; icon: React.ReactNode }) => (
  <td className="px-4 py-4 text-center">
    <button className="inline-flex items-center justify-center p-1 rounded hover:bg-zinc-800 transition-colors">
      {checked ? (
        <CheckCircle2 className="text-emerald-500" size={20} />
      ) : (
        <Circle className="text-zinc-700 hover:text-zinc-500" size={20} />
      )}
    </button>
  </td>
);

export default ComplianceDashboard;