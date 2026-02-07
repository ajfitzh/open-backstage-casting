import React from "react";

interface PrintViewProps {
  rows: any[];
  productionName?: string;
}

export default function CastingPrintView({ rows, productionName = "Production Cast List" }: PrintViewProps) {
  // Filter out empty rows if you only want assigned roles
  // Or keep them to show vacancies. Let's keep them but mark as "OPEN".
  
  return (
    <div className="hidden print:block fixed inset-0 z-[9999] bg-white text-black p-8 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
        <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider">{productionName}</h1>
            <p className="text-sm text-gray-500 mt-1">Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="text-right">
            <p className="font-bold text-lg">{rows.filter(r => r.person && r.person.length > 0).length} Roles Cast</p>
            <p className="text-sm text-gray-500">{rows.length} Total Roles</p>
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-black">
            <th className="py-2 px-4 font-black uppercase w-1/3">Role</th>
            <th className="py-2 px-4 font-black uppercase w-1/3">Actor</th>
            <th className="py-2 px-4 font-black uppercase w-1/3">Notes / Conflicts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isAssigned = row.person && row.person.length > 0;
            const actorName = isAssigned ? row.person[0].value : "OPEN";
            const conflictCount = row.auditionInfo?.conflicts?.split(',').filter(Boolean).length || 0;

            return (
              <tr key={row.id} className="border-b border-gray-300 break-inside-avoid">
                <td className="py-3 px-4 font-bold align-top">
                    {row.role?.[0]?.value || "Unknown Role"}
                </td>
                <td className={`py-3 px-4 font-medium align-top ${!isAssigned ? 'text-gray-400 italic' : ''}`}>
                    {actorName}
                </td>
                <td className="py-3 px-4 text-gray-600 align-top">
                    {/* Add any relevant printable notes here */}
                    {conflictCount > 0 && (
                        <span className="text-xs font-bold border border-gray-400 px-1 rounded">
                            {conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
                        </span>
                    )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
        Internal Use Only • Do Not Distribute Without Approval
      </div>

    </div>
  );
}