"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { UserCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { JSX } from "react/jsx-runtime";

// --- TYPES ---
type StaffCard = {
  id: number;
  name: string;
  roles: string[];
  availability_json: any; // { winter: "Available", spring: "Busy" }
  constraints: string[]; // IDs of people they can't work with
};

type ProductionSlot = {
  id: string; // "winter-director"
  role: string;
  filledBy: StaffCard | null;
  seasonSession: "Fall" | "Winter" | "Spring" | "Summer";
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
  const seasonKey = slot.seasonSession.toLowerCase(); // "winter"
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
    // If they applied for "Director" but you put them in "Music Director"
    // We allow it (maybe they are multi-talented), but warn.
    if (status !== "RED") status = "YELLOW"; 
    issues.push(`Applied for: ${user.roles.join(", ")}`);
  }

  // 3. Interpersonal Constraints (The "No-Fly List")
  currentTeam.forEach((member) => {
    // Check if THIS user hates the existing member
    if (user.constraints?.includes(member.id.toString())) {
      status = "RED";
      issues.push(`Constraint conflict with ${member.name}`);
    }
    // Check if the EXISTING member hates this user
    if (member.constraints?.includes(user.id.toString())) {
      status = "RED";
      issues.push(`${member.name} has a constraint with this user.`);
    }
  });

  return { status, issues };
}

export default function SeasonBoard({ 
  initialTalentPool, 
  initialProductions 
}: { 
  initialTalentPool: StaffCard[], 
  initialProductions: ProductionColumn[] 
}) {
  const [talentPool, setTalentPool] = useState(initialTalentPool);
  const [columns, setColumns] = useState(initialProductions);

  const onDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    // Logic to handle moving from Pool -> Slot or Slot -> Slot
    // For brevity, assuming simple Pool -> Slot logic here:
    
    // 1. Find the User
    const draggedUser = talentPool.find(u => u.id.toString() === result.draggableId);
    if (!draggedUser) return;

    // 2. Find the Destination Slot
    // We need to parse destination.droppableId which might be "winter-main"
    // And index to find the specific slot.
    
    // (Implementation detail: You'd update the 'columns' state here to move the user)
    // For the mockup, we just console log the move
    console.log(`Moved ${draggedUser.name} to ${destination.droppableId}`);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        
        {/* LEFT: THE SEASON CANVAS */}
        <div className="flex-1 p-8 overflow-x-auto flex gap-6">
          {columns.map((col) => (
            <div key={col.id} className="w-96 flex-shrink-0 flex flex-col gap-4">
              <div className="bg-slate-900 text-white p-4 rounded-t-lg shadow-lg">
                <h2 className="text-xl font-bold font-serif">{col.title}</h2>
                <div className="text-sm text-slate-300">{col.showTitle || "Select a Show..."}</div>
              </div>

              <div className="bg-white rounded-b-lg p-4 shadow-sm border border-slate-200 min-h-[500px]">
                {col.slots.map((slot, index) => (
                  <SlotItem 
                    key={slot.id} 
                    slot={slot} 
                    currentTeam={col.slots.map(s => s.filledBy).filter(Boolean) as StaffCard[]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: THE TALENT POOL */}
        <div className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col shadow-2xl z-10">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <UserCircle className="w-5 h-5" />
            Talent Pool ({talentPool.length})
          </h3>
          
          <Droppable droppableId="talent-pool">
            {(provided: { droppableProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>; innerRef: React.Ref<HTMLDivElement> | undefined; placeholder: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="flex-1 overflow-y-auto space-y-2 pr-2"
              >
                {talentPool.map((user, index) => (
                  <Draggable key={user.id} draggableId={user.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-white border border-slate-200 rounded shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
                      >
                        <div className="font-medium text-slate-800">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {user.roles.join(", ")}
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
    <div className="mb-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {slot.role}
      </div>
      
      <Droppable droppableId={slot.id}>
        {(provided: { innerRef: React.Ref<HTMLDivElement> | undefined; droppableProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLDivElement> & React.HTMLAttributes<HTMLDivElement>; placeholder: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, snapshot: { isDraggingOver: any; }) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              min-h-[60px] rounded border-2 transition-colors p-2
              ${snapshot.isDraggingOver ? 'bg-slate-50 border-slate-400' : 'bg-slate-50/50 border-dashed border-slate-300'}
              ${slot.filledBy ? 'bg-white border-solid' : ''}
            `}
          >
            {slot.filledBy ? (
              <FilledSlotCard user={slot.filledBy} slot={slot} team={currentTeam} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm italic">
                Drag staff here
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
  // RUN THE LOGIC!
  const { status, issues } = checkConflict(user, slot, team);

  const borderColors = {
    GREEN: "border-l-4 border-l-green-500",
    YELLOW: "border-l-4 border-l-yellow-500",
    RED: "border-l-4 border-l-red-500 bg-red-50",
  };

  return (
    <Draggable draggableId={user.id.toString()} index={0}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-2 bg-white shadow-sm border border-slate-200 rounded ${borderColors[status as keyof typeof borderColors]}`}
        >
          <div className="flex justify-between items-start">
            <span className="font-medium text-sm">{user.name}</span>
            {status === "GREEN" && <CheckCircle className="w-4 h-4 text-green-500" />}
            {status === "YELLOW" && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            {status === "RED" && <XCircle className="w-4 h-4 text-red-500" />}
          </div>
          
          {issues.length > 0 && (
            <div className="mt-1 text-[10px] text-slate-500 leading-tight">
              {issues.map((issue, i) => (
                <div key={i}>• {issue}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}