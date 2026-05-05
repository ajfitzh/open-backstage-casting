// app/components/casting/FamilyHubStudentCard.tsx
"use client";

import React, { useState } from "react";
import { Clock, AlertCircle, CheckCircle2, PenTool, Lock, Ticket, Megaphone } from "lucide-react";
import AcceptRoleModal from "./AcceptRoleModal";
import { saveStudentBio, saveCongratsAd, saveTicketsSold } from "@/app/actions/auditions"; 

export default function FamilyHubStudentCard({ student, show, tenant, userEmail }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Bio State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(student.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Congrats Ad State
  const [isEditingAd, setIsEditingAd] = useState(false);
  const [adText, setAdText] = useState(student.congratsAd || "");
  const [isSavingAd, setIsSavingAd] = useState(false);

  // Tickets State
  const [ticketsSold, setTicketsSold] = useState(student.ticketsSold || 0);
  const [editTickets, setEditTickets] = useState(student.ticketsSold || 0);
  const [isSavingTickets, setIsSavingTickets] = useState(false);

  const isCast = student.status === "Cast";
  const hasSignedLegal = student.signatures?.includes("S") && student.signatures?.includes("P");
  
  const wordCount = bioText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;

  const handleSaveBio = async () => {
     setIsSavingBio(true);
     await saveStudentBio(tenant, student.id, bioText);
     setIsEditingBio(false);
     setIsSavingBio(false);
  };

  const handleSaveAd = async () => {
     setIsSavingAd(true);
     await saveCongratsAd(tenant, student.id, adText);
     setIsEditingAd(false);
     setIsSavingAd(false);
  };

  const handleSaveTickets = async () => {
     setIsSavingTickets(true);
     await saveTicketsSold(tenant, student.studentId, show.id, editTickets);
     setTicketsSold(editTickets);
     setIsSavingTickets(false);
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter">{student.name}</h3>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{show.title}</p>
        </div>
      </div>

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
             onSuccess={() => { setIsModalOpen(false); window.location.reload(); }}
             tenant={tenant} auditionId={student.id} studentName={student.name} roleName={student.role || "Cast Member"} showTitle={show.title} parentEmail={userEmail}
           />
         </>
      )}

      {isCast && hasSignedLegal && (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-emerald-500" />
               </div>
               <div>
                  <p className="font-black text-emerald-400 text-sm uppercase tracking-widest">Role Accepted: {student.role || "Cast Member"}</p>
                  <p className="text-xs text-emerald-500/80 font-medium">Waivers signed. You are officially in the cast!</p>
               </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-inner">
               <h4 className="font-black text-[10px] uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                  <PenTool size={12} /> Production Action Items
               </h4>

               {/* Task 1: Tickets Sold */}
               <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden p-4">
                  <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                        <Ticket size={16} className="text-blue-500" />
                        <div>
                           <p className="font-black text-white text-sm">Tickets Sold</p>
                           <p className="text-xs text-zinc-500 font-medium">Goal: 20 tickets per family.</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-blue-500">{ticketsSold}</span>
                        <span className="text-sm font-bold text-zinc-500">/ 20</span>
                     </div>
                  </div>
                  
                  <div className="w-full bg-zinc-950 rounded-full h-3 mb-4 overflow-hidden border border-zinc-800">
                     <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((ticketsSold / 20) * 100, 100)}%` }}
                     />
                  </div>

                  <div className="flex gap-2">
                     <input 
                        type="number" 
                        min="0"
                        value={editTickets}
                        onChange={(e) => setEditTickets(parseInt(e.target.value) || 0)}
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm text-center font-bold text-white outline-none focus:border-blue-500"
                     />
                     <button 
                        onClick={handleSaveTickets}
                        disabled={isSavingTickets || editTickets === ticketsSold}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                     >
                        {isSavingTickets ? "Saving..." : "Update"}
                     </button>
                  </div>
               </div>

               {/* Task 2: Program Bio */}
               <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                     <div>
                        <p className="font-black text-white text-sm">Submit Program Bio</p>
                        <p className="text-xs text-zinc-500 font-medium">Max 100 words for the Playbill.</p>
                     </div>
                     {!isEditingBio && (
                        <button 
                           onClick={() => setIsEditingBio(true)}
                           className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                              student.bio || bioText ? "bg-zinc-800 text-zinc-300 hover:text-white" : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg"
                           }`}
                        >
                           {student.bio || bioText ? "Edit Bio" : "Write Bio"}
                        </button>
                     )}
                  </div>
                  
                  {isEditingBio && (
                     <div className="p-4 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2">
                        <textarea 
                           value={bioText}
                           onChange={(e) => setBioText(e.target.value)}
                           placeholder={`E.g. ${student.name} is thrilled to be performing in ${show.title}...`}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[120px]"
                        />
                        <div className="flex items-center justify-between mt-3">
                           <span className={`text-xs font-bold ${wordCount > 100 ? 'text-red-500' : 'text-zinc-500'}`}>
                              {wordCount} / 100 words
                           </span>
                           <div className="flex gap-2">
                              <button onClick={() => setIsEditingBio(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors">Cancel</button>
                              <button 
                                 onClick={handleSaveBio}
                                 disabled={isSavingBio || wordCount > 100}
                                 className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                 {isSavingBio ? "Saving..." : "Save Bio"}
                              </button>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {/* Task 3: Congrats Ad */}
               <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                     <div>
                        <p className="font-black text-white text-sm flex items-center gap-2">
                           <Megaphone size={14} className="text-zinc-500" /> Submit Congrats Ad
                        </p>
                        <p className="text-xs text-zinc-500 font-medium">Add a special message for the playbill.</p>
                     </div>
                     {!isEditingAd && (
                        <button 
                           onClick={() => setIsEditingAd(true)}
                           className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                              student.congratsAd || adText ? "bg-zinc-800 text-zinc-300 hover:text-white" : "bg-purple-600 text-white hover:bg-purple-500 shadow-lg"
                           }`}
                        >
                           {student.congratsAd || adText ? "Edit Ad" : "Write Ad"}
                        </button>
                     )}
                  </div>
                  
                  {isEditingAd && (
                     <div className="p-4 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2">
                        <textarea 
                           value={adText}
                           onChange={(e) => setAdText(e.target.value)}
                           placeholder={`E.g. We are so proud of you, ${student.name}! Break a leg!`}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[80px]"
                        />
                        <div className="flex justify-end mt-3 gap-2">
                           <button onClick={() => setIsEditingAd(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors">Cancel</button>
                           <button 
                              onClick={handleSaveAd}
                              disabled={isSavingAd}
                              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                           >
                              {isSavingAd ? "Saving..." : "Save Ad"}
                           </button>
                        </div>
                     </div>
                  )}
               </div>

               {/* Task 4: Locked Future Task */}
               <div className="flex items-center justify-between gap-4 p-4 bg-zinc-900 border border-white/5 rounded-xl opacity-50 cursor-not-allowed">
                  <div>
                     <p className="font-black text-white text-sm flex items-center gap-2">
                        <Lock size={14} className="text-zinc-500" /> Cast Party Order
                     </p>
                     <p className="text-xs text-zinc-500 font-medium">Unlocks 2 weeks before closing night.</p>
                  </div>
               </div>

            </div>
         </div>
      )}
    </div>
  );
}