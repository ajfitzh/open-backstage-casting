import { z } from 'zod';

const BaserowArrayField = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).nullish().transform(val => val ?? []);

const BaserowLinkSchema = z.object({
  id: z.number(),
  value: z.any() 
}).passthrough();

// ==================================
//         EVENTS SCHEMA (Table 625)
// ==================================
const RawEventSchema = z.object({
  id: z.number(),
  'Event Date': z.string().nullish(),
  'Start Time': z.string().nullish(),
  'End Time': z.string().nullish(),
  'Event Type': z.any(),
  'Notes': z.string().nullish(),
}).passthrough();

export const EventSchema = RawEventSchema.transform(data => ({
  id: data.id,
  date: data['Event Date'] || "",
  startTime: data['Start Time'] || "",
  endTime: data['End Time'] || "",
  type: data['Event Type']?.value || "Rehearsal",
  notes: data.Notes || ""
}));
export const EventListSchema = z.array(EventSchema);

// ==================================
//         SLOTS SCHEMA (Table 640)
// ==================================
const RawSlotSchema = z.object({
  id: z.number(),
  'Event Link': BaserowArrayField(BaserowLinkSchema),
  'Scene': BaserowArrayField(BaserowLinkSchema),
  'Track': z.any(),
  'Start Time': z.string().nullish(),
  'End Time': z.string().nullish(),
  'Duration': z.coerce.number().nullish(),
}).passthrough();

export const SlotSchema = RawSlotSchema.transform(data => ({
  id: data.id,
  eventId: data['Event Link']?.[0]?.id || null,
  sceneId: data.Scene?.[0]?.id || null,
  sceneName: typeof data.Scene?.[0]?.value === 'string' ? data.Scene[0].value : (data.Scene?.[0]?.value?.value || "Unknown Scene"),
  track: data.Track?.value || "Blocking",
  startTime: data['Start Time'] || "",
  endTime: data['End Time'] || "",
  duration: data.Duration || 0
}));
export const SlotListSchema = z.array(SlotSchema);

// ==================================
//       CONFLICTS SCHEMA (Table 623)
// ==================================
const RawConflictSchema = z.object({
  id: z.number(),
  'Person': BaserowArrayField(BaserowLinkSchema),
  'Production Event': BaserowArrayField(BaserowLinkSchema), // 🟢 ADDED THIS
  'Date': z.any(), 
  'Conflict Type': z.any(),
  'Notes': z.string().nullish()
}).passthrough();

export const ConflictSchema = RawConflictSchema.transform(data => {
  let dateVal = "";
  if (Array.isArray(data.Date) && data.Date.length > 0) {
     dateVal = typeof data.Date[0]?.value === 'string' ? data.Date[0].value : (data.Date[0]?.value?.value || "");
  }

  return {
    id: data.id,
    personId: data.Person?.[0]?.id || null,
    personName: typeof data.Person?.[0]?.value === 'string' ? data.Person[0].value : (data.Person?.[0]?.value?.value || "Unknown Actor"),
    eventId: data['Production Event']?.[0]?.id || null, // 🟢 ADDED THIS
    date: dateVal,
    type: data['Conflict Type']?.value || "Full",
    notes: data.Notes || ""
  };
});
export const ConflictListSchema = z.array(ConflictSchema);
