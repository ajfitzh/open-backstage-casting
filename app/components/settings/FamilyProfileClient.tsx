"use client";

import React, { useState } from "react";
import { User, Home, HeartPulse, Shirt, Phone, Save, CheckCircle2, ShieldAlert } from "lucide-react";
import { updateStudentMasterProfile } from "@/app/actions/family";

const T_SHIRT_SIZES = ["Youth S", "Youth M", "Youth L", "Adult S", "Adult M", "Adult L", "Adult XL", "Adult XXL"];

export default function FamilyProfileClient({ tenant, initialFamily, userEmail }: any) {
  // Initialize local state for the family members so we can edit them
  const [family, setFamily] = useState<any[]>(initialFamily);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const handleUpdateField = (personId: number, field: string, value: any) => {
    setFamily(prev => prev.map(p => p.id === personId ? { ...p, [field]: value } : p));
  };

  const handleSaveProfile = async (person: any) => {
    setSavingId(person.id);
    
    const res = await updateStudentMasterProfile(tenant, person.id, {
        address: person.Address,
        emergencyContact: person['Emergency Contact'],
        tShirtSize: person['T-Shirt Size'],
        allergies: person.Allergies,
        tylenol: person['Tylenol Permission'],
        ibuprofen: person['Ibuprofen Permission']
    });

    if (res.success) {
        setSuccessId(person.id);
        setTimeout(() => setSuccessId(null), 3000);
    } else {
        alert(res.error);
    }
    setSavingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-600 rounded-[2rem] p-8 shadow-xl text-white">
         <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Master Family Profile</h2>
            <p className="text-blue-200 text-sm font-medium leading-relaxed max-w-xl">
              Set this up once, and never fill out a paper medical form again. This data automatically securely attaches to your audition and class registrations.
            </p>
         </div>
      </div>

      <div className="space-y-6">
        {family.map((person) => (
          <div key={person.id} className="bg-zinc-900 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
             
             {/* Header */}
             <div className="p-6 sm:p-8 border-b border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   {person.Headshot ? (
                      <img src={person.Headshot[0]?.url || person.Headshot} alt={person['First Name']} className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700" />
                   ) : (
                      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                         <User size={24} className="text-zinc-500" />
                      </div>
                   )}
                   <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter">{person['First Name']} {person['Last Name']}</h3>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">DOB: {person['Date of Birth'] || "Not Set"}</p>
                   </div>
                </div>
                
                <button 
                  onClick={() => handleSaveProfile(person)}
                  disabled={savingId === person.id}
                  className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shrink-0 ${
                      successId === person.id 
                        ? "bg-emerald-500 text-white" 
                        : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
                  }`}
                >
                  {savingId === person.id ? "Saving..." : successId === person.id ? <><CheckCircle2 size={16}/> Saved</> : <><Save size={16}/> Save Profile</>}
                </button>
             </div>

             {/* Form Body */}
             <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                
                {/* Column 1: Logistics */}
                <div className="space-y-6">
                   <h4 className="font-black text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
                     <Home size={14} /> Logistics & Contact
                   </h4>
                   
                   <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Home Address</label>
                      <input 
                         type="text" 
                         placeholder="123 Main St, Fredericksburg VA 22401"
                         value={person.Address || ""}
                         onChange={(e) => handleUpdateField(person.id, 'Address', e.target.value)}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1">
                        <Phone size={12}/> Emergency Contact
                      </label>
                      <input 
                         type="text" 
                         placeholder="Jane Doe - (555) 123-4567"
                         value={person['Emergency Contact'] || ""}
                         onChange={(e) => handleUpdateField(person.id, 'Emergency Contact', e.target.value)}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1">
                        <Shirt size={12}/> T-Shirt Size
                      </label>
                      <select 
                         value={person['T-Shirt Size'] || ""}
                         onChange={(e) => handleUpdateField(person.id, 'T-Shirt Size', e.target.value)}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                         <option value="" disabled>Select a size...</option>
                         {T_SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>

                {/* Column 2: Medical */}
                <div className="space-y-6">
                   <h4 className="font-black text-[10px] uppercase tracking-widest text-red-400 flex items-center gap-2 border-b border-zinc-800 pb-2">
                     <HeartPulse size={14} /> Medical & Safety
                   </h4>

                   <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1">
                        <ShieldAlert size={12} className="text-amber-500" /> Allergies / Medical Notes
                      </label>
                      <textarea 
                         placeholder="E.g., Peanut allergy, carries epi-pen. Or type 'None'."
                         value={person.Allergies || ""}
                         onChange={(e) => handleUpdateField(person.id, 'Allergies', e.target.value)}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-red-500 transition-colors min-h-[100px]"
                      />
                   </div>

                   <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-relaxed">
                         Staff Medication Permission
                      </p>
                      
                      <label className="flex items-center justify-between cursor-pointer group">
                         <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Provide Tylenol (Acetaminophen)</span>
                         <input 
                           type="checkbox" 
                           checked={person['Tylenol Permission'] || false}
                           onChange={(e) => handleUpdateField(person.id, 'Tylenol Permission', e.target.checked)}
                           className="w-5 h-5 rounded text-blue-600 bg-zinc-900 border-zinc-700" 
                         />
                      </label>

                      <div className="h-px bg-zinc-800 w-full" />

                      <label className="flex items-center justify-between cursor-pointer group">
                         <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Provide Advil/Motrin (Ibuprofen)</span>
                         <input 
                           type="checkbox" 
                           checked={person['Ibuprofen Permission'] || false}
                           onChange={(e) => handleUpdateField(person.id, 'Ibuprofen Permission', e.target.checked)}
                           className="w-5 h-5 rounded text-blue-600 bg-zinc-900 border-zinc-700" 
                         />
                      </label>
                   </div>
                </div>

             </div>
          </div>
        ))}
      </div>
    </div>
  );
}