"use client";

import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  User, 
  DollarSign, 
  FileText, 
  Camera, 
  Ruler,
  AlertCircle
} from 'lucide-react';

interface Student {
  id: string | number;
  performerName: string;
  signedAgreement: boolean;
  paidFees: boolean;
  headshotSubmitted: boolean;
  measurementsTaken: boolean;
}

interface ComplianceDashboardProps {
  students?: Student[];
  productionTitle: string; 
}

const ComplianceDashboard = ({ students = [], productionTitle = "Select a Production" }: ComplianceDashboardProps) => {
  
  // 1. Safety Check: If no students exist, show a specific message for THIS production
  if (!students || students.length === 0) {
    return (
      <div className="bg-zinc-950 text-zinc-50 p-6 min-h-screen flex flex-col items-center justify-center">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Staff Portal: Compliance & Onboarding</h1>
          <p className="text-zinc-400 mt-1">
            Production: <span className="text-emerald-500 font-medium">{productionTitle}</span>
          </p>
        </header>
        <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-900/50 max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No Cast Members Found</h3>
          <p className="text-sm mt-2">
            We couldn&apos;t find any cast members for <strong className="text-zinc-300">{productionTitle}</strong>.
          </p>
          <p className="text-xs mt-4 text-zinc-600">
             Ensure you have assigned roles in the <strong>Assignments</strong> table and linked them to this specific production.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-zinc-50 p-6 min-h-screen">
      <header className="mb-8 border-b border-zinc-900 pb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Portal: Compliance & Onboarding</h1>
            <p className="text-zinc-400 mt-1">
              Production: <span className="text-emerald-500 font-medium">{productionTitle}</span>
            </p>
          </div>
          <div className="text-right">
             <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Total Cast</div>
             <div className="text-2xl font-mono text-zinc-200">{students.length}</div>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 shadow-xl shadow-black/20">
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
          <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-zinc-900/80 transition-colors group">
                <td className="px-4 py-4 font-medium flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-700 group-hover:text-emerald-500 transition-colors">
                    <User size={16} />
                  </div>
                  <span className="text-zinc-200 group-hover:text-white transition-colors">
                    {student.performerName || "Unknown Performer"}
                  </span>
                </td>
                
                {/* Compliance Checkboxes */}
                <ComplianceCell checked={student.signedAgreement} icon={<FileText size={16}/>} />
                <ComplianceCell checked={student.paidFees} icon={<DollarSign size={16}/>} />
                <ComplianceCell checked={student.headshotSubmitted} icon={<Camera size={16}/>} />
                <ComplianceCell checked={student.measurementsTaken} icon={<Ruler size={16}/>} />

                <td className="px-4 py-4 text-right">
                  <button className="text-zinc-500 hover:text-white text-xs hover:bg-zinc-800 px-3 py-1.5 rounded transition-colors border border-transparent hover:border-zinc-700">
                    Details
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
    <button 
      className={`inline-flex items-center justify-center p-2 rounded-full transition-all duration-300 ${
        checked 
          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
          : 'text-zinc-700 hover:text-zinc-500 hover:bg-zinc-800'
      }`}
      title={checked ? "Completed" : "Pending"}
    >
      {checked ? (
        <CheckCircle2 size={18} />
      ) : (
        <Circle size={18} />
      )}
    </button>
  </td>
);

export default ComplianceDashboard;