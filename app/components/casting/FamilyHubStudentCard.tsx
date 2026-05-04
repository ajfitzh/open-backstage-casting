"use client";

import React, { useState } from "react";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import AcceptRoleModal from "./AcceptRoleModal";

export default function FamilyHubStudentCard({ student, show, tenant, userEmail }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isCast = student.status === "Cast";
  const hasSignedLegal = student.signatures?.includes("S") && student.signatures?.includes("P");

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter">{student.name}</h3>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{show.title}</p>
        </div>
      </div>

      {/* STATE 1: PENDING */}
      {!isCast && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-zinc-500" />
          </div>
          <div>
            <p className="font-black text-zinc-300 text-sm uppercase tracking-widest">Audition Complete</p>
            <p className="text-xs text-zinc-500 font-medium">The directors are currently deliberating. Cast list drops Friday!</p>
          </div>
        </div>
      )}

      {/* STATE 2: THE "RED BOX" (Cast, but missing signatures) */}
      {isCast && !hasSignedLegal && (
        <>
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-black text-red-400 text-sm uppercase tracking-widest">Role Offered: {student.role || "Cast Member"}</p>
                <p className="text-xs text-red-500/80 font-bold">Action Required: You must accept your role and sign waivers.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-colors shrink-0"
            >
              Accept & Sign
            </button>
          </div>

          <AcceptRoleModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
               setIsModalOpen(false);
               window.location.reload(); // Refresh to see the green box!
            }}
            tenant={tenant}
            auditionId={student.id}
            studentName={student.name}
            roleName={student.role || "Cast Member"}
            showTitle={show.title}
            parentEmail={userEmail}
          />
        </>
      )}

      {/* STATE 3: THE "GREEN BOX" (Cast & Signed) */}
      {isCast && hasSignedLegal && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="font-black text-emerald-400 text-sm uppercase tracking-widest">Role Accepted: {student.role || "Cast Member"}</p>
            <p className="text-xs text-emerald-500/80 font-medium">Waivers signed. See you at rehearsal!</p>
          </div>
        </div>
      )}
    </div>
  );
}