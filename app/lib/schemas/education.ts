import { z } from 'zod';

const BaserowArrayField = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).nullish().transform(val => val ?? []);

const BaserowLinkSchema = z.object({
  id: z.number(),
  value: z.any() 
}).passthrough();

// ==================================
//         CLASS SCHEMA (Table 633)
// ==================================
const RawClassSchema = z.object({
  id: z.number(),
  'Class Name': z.any(),
  'Full Class Name': z.any(),
  'Session': BaserowArrayField(BaserowLinkSchema),
  'Teacher': BaserowArrayField(BaserowLinkSchema),
  'Location': z.any(),
  'Space': BaserowArrayField(BaserowLinkSchema),
  'Day': z.any(),
  'Time Slot': z.any(),
  'Type': z.any(),
  'Status': z.any(),
  'Students': BaserowArrayField(BaserowLinkSchema), // Count of students enrolled
  'Minimum Age': z.coerce.number().nullish(),
  'Maximum Age': z.coerce.number().nullish(),
}).passthrough();

export const ClassSchema = RawClassSchema.transform(data => {
  const name = typeof data['Class Name'] === 'string' ? data['Class Name'] : (data['Class Name']?.value || "Unnamed Class");
  const session = data.Session?.[0]?.value || "Unknown Session";
  const teacher = data.Teacher?.[0]?.value || "TBA";
  
  const min = data['Minimum Age'] || 0;
  const max = data['Maximum Age'] || 99;
  const ageRange = (min === 0 && max === 99) ? "All Ages" : (max === 99 ? `${min}+` : `${min} - ${max}`);

  return {
    id: data.id,
    name: name,
    session: typeof session === 'string' ? session : session?.value || "Unknown Session",
    teacher: typeof teacher === 'string' ? teacher : teacher?.value || "TBA",
    location: data.Location?.value || "General",
    spaceId: data.Space?.[0]?.id || null,
    spaceName: typeof data.Space?.[0]?.value === 'string' ? data.Space[0].value : (data.Space?.[0]?.value?.value || "Unknown Room"),
    day: data.Day?.value || "TBD",
    time: data['Time Slot']?.value || "TBD",
    type: data.Type?.value || "General",
    status: data.Status?.value || "Pending",
    minAge: min,
    maxAge: max,
    ageRange: ageRange,
    students: data.Students.length, // Just need the count for the main grid
  };
});

export const ClassListSchema = z.array(ClassSchema);
