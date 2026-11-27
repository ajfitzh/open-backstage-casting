"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DroppableStateSnapshot } from "@hello-pangea/dnd";
import { UserCircle, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useTenant } from "@/app/components/TenantProvider";
import { setSeasonSlotAssignment } from "@/app/actions/admin-crud";

// --- TYPES ---
export type StaffCard = {
  id: number;
  name: string;
  roles: string[];
  availability_json: any;
  constraints: string[];
};

// Incoming data from the Server (Page.tsx)
type IncomingProduction = {
  id: number;
  title: string;
  status: string;
};

// Internal State Types
type ProductionSlot = {
  id: string; 
  role: string;
  filledBy: StaffCard | null;
  seasonSession: string;
};

type ProductionColumn = {
  id: string;
  title: string;
  showTitle: string;
  slots: ProductionSlot[];
};

// --- THE LOGIC ENGINE ---
function checkConflict(user: StaffCard, slot: ProductionSlot, currentTeam: StaffCard[]) {
  const issues = [];
  let status = "GREEN";

  // 1. Availability Check
  // We default to "Fall" if session is missing for safety
  const seasonKey = (slot.seasonSession || "Fall").toLowerCase(); 
  const avail = user.availability_json?.[seasonKey];
  
  if (avail === "Busy") {
    status = "RED";
    issues.push("Marked BUSY for this season.");
  } else if (avail === "Maybe") {
    status = "YELLOW";
    issues.push("Marked MAYBE for this season.");
  }

  // 2. Role Check
  if (!user.roles.includes(slot.role)) {
    if (status !== "RED") status = "YELLOW"; 
    issues.push(`Applied for: ${user.roles.join(", ")}`);
  }

  // 3. Interpersonal Constraints
  currentTeam.forEach((member) => {
    if (user.constraints?.includes(member.id.toString())) {
      status = "RED";
      issues.push(`Constraint conflict with ${member.name}`);
    }
    if (member.constraints?.includes(user.id.toString())) {
      status = "RED";
      issues.push(`${member.name} has a constraint with this user.`);
    }
  });

  return { status, issues };
}

// --- MAIN COMPONENT ---
export default function SeasonBoard({ 
  initialTalent, 
  initialSlots, // These are actually Productions from the DB
  seasonId 
}: { 
  initialTalent: StaffCard[], 
  initialSlots: IncomingProduction[],
  seasonId: string
}) {

  // 1. Transform Incoming Productions into Board Columns
  // We automatically generate standard slots for every show found.
  const generateColumns = (): ProductionColumn[] => {
    return initialSlots.map((prod) => ({
      id: prod.id.toString(),
      title: prod.status || "Production",
      showTitle: prod.title,
      slots: [
        { id: `${prod.id}-director`, role: "Director", filledBy: null, seasonSession: "Winter" },
        { id: `${prod.id}-md`, role: "Music Director", filledBy: null, seasonSession: "Winter" },
        { id: `${prod.id}-choreo`, role: "Choreographer", filledBy: null, seasonSession: "Winter" },
        { id: `${prod.id}-sm`, role: "Stage Manager", filledBy: null, seasonSession: "Winter" },
      ]
    }));
  };

  const tenant = useTenant();
  const [talentPool, setTalentPool] = useState<StaffCard[]>(initialTalent);
  const [columns, setColumns] = useState<ProductionColumn[]>(generateColumns());
  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // A. Identify the User being dragged
    let draggedUser = talentPool.find(u => u.id.toString() === draggableId);

    if (!draggedUser) {
        columns.forEach(col => {
            col.slots.forEach(slot => {
                if (slot.filledBy && slot.filledBy.id.toString() === draggableId) {
                    draggedUser = slot.filledBy;
                }
            });
        });
    }

    if (!draggedUser) return;

    // B. Create copies of state
    const newPool = [...talentPool];
    const newColumns = columns.map(col => ({
      ...col,
      slots: col.slots.map(s => ({ ...s })),
    }));

    let sourceSlotMeta: { productionId: number; role: string } | null = null;
    let destSlotMeta: { productionId: number; role: string } | null = null;

    // C. Remove from Source
    if (source.droppableId === "talent-pool") {
        const index = newPool.findIndex(u => u.id === draggedUser!.id);
        if (index > -1) newPool.splice(index, 1);
    } else {
        newColumns.forEach(col => {
            col.slots.forEach(slot => {
                if (slot.id === source.droppableId) {
                    slot.filledBy = null;
                    sourceSlotMeta = { productionId: Number(col.id), role: slot.role };
                }
            });
        });
    }

    // D. Add to Destination
    if (destination.droppableId === "talent-pool") {
        newPool.splice(destination.index, 0, draggedUser);
    } else {
        newColumns.forEach(col => {
            col.slots.forEach(slot => {
                if (slot.id === destination.droppableId) {
                    if (slot.filledBy) {
                        newPool.push(slot.filledBy);
                    }
                    slot.filledBy = draggedUser!;
                    destSlotMeta = { productionId: Number(col.id), role: slot.role };
                }
            });
        });
    }

    // E. Optimistic Update
    setTalentPool(newPool);
    setColumns(newColumns);

    // F. Persist to Postgres show_team
    if (tenant) {
      setSavingNotice("Saving...");
      try {
        if (sourceSlotMeta) {
          const src = sourceSlotMeta as { productionId: number; role: string };
          await setSeasonSlotAssignment(tenant, src.productionId, src.role, null);
        }
        if (destSlotMeta) {
          const dst = destSlotMeta as { productionId: number; role: string };
          await setSeasonSlotAssignment(tenant, dst.productionId, dst.role, draggedUser.id);
        }
        setSavingNotice("Saved");
        setTimeout(() => setSavingNotice(null), 1800);
      } catch {
        setSavingNotice("Save failed");
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full bg-slate-50 overflow-hidden">
        
        {/* LEFT: THE SEASON CANVAS */}
        <div className="flex-1 p-8 overflow-x-auto flex gap-6">
          {columns.map((col) => (
            <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
              <div className="bg-slate-900 text-white p-4 rounded-t-lg shadow-lg border-b-4 border-blue-500">
                <h2 className="text-lg font-bold font-serif leading-tight">{col.showTitle}</h2>
                <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">{col.title}</div>
              </div>

              <div className="bg-white rounded-b-lg p-4 shadow-sm border border-slate-200 min-h-[400px] flex flex-col gap-3">
                {col.slots.map((slot) => (
                  <SlotItem 
                    key={slot.id} 
                    slot={slot} 
                    currentTeam={col.slots.map(s => s.filledBy).filter(Boolean) as StaffCard[]}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {columns.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-300 rounded-xl m-8">
               No productions found for this season.
            </div>
          )}
        </div>

        {/* RIGHT: THE TALENT POOL */}
        <div className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col shadow-2xl z-10">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-blue-600" />
              Talent Pool ({talentPool.length})
            </span>
            {savingNotice && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                {savingNotice === "Saving..." && <Loader2 className="w-3 h-3 animate-spin" />}
                {savingNotice}
              </span>
            )}
          </h3>
          
          <Droppable droppableId="talent-pool">
            {(provided: DroppableProvided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="flex-1 overflow-y-auto space-y-2 pr-2"
              >
                {talentPool.map((user, index) => (
                  <Draggable key={user.id} draggableId={user.id.toString()} index={index}>
                    {(provided: DraggableProvided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group hover:border-blue-400"
                      >
                        <div className="font-bold text-slate-800">{user.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.roles.map(r => (
                             <span key={r} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

      </div>
    </DragDropContext>
  );
}

// --- SUBCOMPONENT: THE SLOT ---
function SlotItem({ slot, currentTeam }: { slot: ProductionSlot, currentTeam: StaffCard[] }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
        {slot.role}
      </div>
      
      <Droppable droppableId={slot.id}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              min-h-[50px] rounded-lg border-2 transition-all p-1
              ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-slate-50 border-dashed border-slate-300'}
              ${slot.filledBy ? 'bg-white border-solid border-slate-200 p-0 overflow-hidden' : ''}
            `}
          >
            {slot.filledBy ? (
              <FilledSlotCard user={slot.filledBy} slot={slot} team={currentTeam} />
            ) : (
              <div className="h-10 flex items-center justify-center text-slate-300 text-xs italic">
                Empty
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function FilledSlotCard({ user, slot, team }: { user: StaffCard, slot: ProductionSlot, team: StaffCard[] }) {
  const { status, issues } = checkConflict(user, slot, team);

  const statusStyles = {
    GREEN: "border-l-green-500",
    YELLOW: "border-l-yellow-500 bg-yellow-50/30",
    RED: "border-l-red-500 bg-red-50",
  };

  return (
    <Draggable draggableId={user.id.toString()} index={0}>
      {(provided: DraggableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-2 bg-white border-l-4 ${statusStyles[status as keyof typeof statusStyles]} rounded-r cursor-grab active:cursor-grabbing`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-xs text-slate-800">{user.name}</span>
            {status === "GREEN" && <CheckCircle className="w-3 h-3 text-green-500" />}
            {status === "YELLOW" && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
            {status === "RED" && <XCircle className="w-3 h-3 text-red-500" />}
          </div>
          
          {issues.length > 0 && (
            <div className="space-y-0.5">
              {issues.map((issue, i) => (
                <div key={i} className="text-[9px] text-slate-500 leading-tight flex items-start gap-1">
                  <span className="text-red-400">•</span> {issue}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}