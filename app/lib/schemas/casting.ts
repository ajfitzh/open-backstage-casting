import { z } from 'zod';

const BaserowArrayField = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).nullish().transform(val => val ?? []);

// 🚨 THE FIX: value changed to z.any() to handle nested Baserow objects
const BaserowLinkSchema = z.object({
  id: z.number(),
  value: z.any() 
}).passthrough();

// ==================================
//         SCENE SCHEMA (Table 627)
// ==================================
const RawSceneSchema = z.object({
  id: z.number(),
  'Scene Name': z.any(), 
  'Act': z.any(),        
  'Scene Type': z.any(),
  'Order': z.coerce.number().nullish(),
  'Music Load': z.coerce.number().nullish(),
  'Dance Load': z.coerce.number().nullish(),
  'Blocking Load': z.coerce.number().nullish(),
}).passthrough();

export const SceneSchema = RawSceneSchema.transform(data => {
  const sceneName = typeof data['Scene Name'] === 'string' ? data['Scene Name'] : `Scene ${data.id}`;
  return {
    id: data.id,
    name: sceneName,
    sceneNumber: sceneName,
    act: data.Act?.value || "1",
    type: data['Scene Type']?.value || "Scene",
    order: data['Order'] || data.id,
    load: {
      music: data['Music Load'] || 1,
      dance: data['Dance Load'] || 1,
      block: data['Blocking Load'] || 1,
    }
  };
});
export const SceneListSchema = z.array(SceneSchema);
// ==================================
//    BLUEPRINT ROLE SCHEMA (Table 605)
// ==================================
const RawRoleSchema = z.object({
  id: z.number(),
  'Role Name': z.any(), // 🚨 Relaxed
  'Role Type': z.any(), // 🚨 Relaxed
  'Active Scenes': BaserowArrayField(BaserowLinkSchema),
}).passthrough();

export const RoleSchema = RawRoleSchema.transform(data => ({
  id: data.id,
  name: typeof data['Role Name'] === 'string' ? data['Role Name'] : "Unnamed Role",
  type: typeof data['Role Type'] === 'string' ? data['Role Type'] : "Role",
  activeScenes: data['Active Scenes'],
}));
export const RoleListSchema = z.array(RoleSchema);

// ==================================
//   ROSTER / AUDITIONS SCHEMA (Table 630)
// ==================================
const RawAuditionSchema = z.object({
  id: z.number(),
  'Performer': BaserowArrayField(BaserowLinkSchema),
  'Vocal Score': z.coerce.number().nullish(),
  'Acting Score': z.coerce.number().nullish(),
  'Dance Score': z.coerce.number().nullish(),
  'Gender': z.any(), 
  'Headshot': z.any(),
  // 🟢 NEW COMPLIANCE FIELDS ADDED HERE
  'Paid Fees': z.boolean().nullish(),
  'Measurements Taken': z.boolean().nullish(),
  'Commitment to Character': z.boolean().nullish(),
}).passthrough();

export const RosterStudentSchema = RawAuditionSchema.transform(data => {
  const person = data.Performer[0] || { id: data.id, value: 'Unknown Actor' };
  
  const personName = typeof person.value === 'string' ? person.value : 
                     (person.value?.value ? person.value.value : 'Unknown Actor');

  let genderVal = null;
  if (Array.isArray(data.Gender) && data.Gender.length > 0) {
    const firstG = data.Gender[0];
    genderVal = typeof firstG.value === 'string' ? firstG.value : firstG.value?.value;
  }

  let avatarUrl = "https://placehold.co/150x150/222/888?text=Actor"; 
  let hasHeadshot = false; // 🟢 Track if they uploaded a real photo
  if (Array.isArray(data.Headshot) && data.Headshot.length > 0) {
     const firstItem = data.Headshot[0];
     if (Array.isArray(firstItem) && firstItem.length > 0 && firstItem[0].url) {
         avatarUrl = firstItem[0].url;
         hasHeadshot = true;
     } else if (firstItem.url) {
         avatarUrl = firstItem.url;
         hasHeadshot = true;
     }
  }

  return {
    id: person.id,
    name: personName,
    avatar: avatarUrl, 
    vocalScore: data['Vocal Score'] || 0,
    actingScore: data['Acting Score'] || 0,
    danceScore: data['Dance Score'] || 0,
    auditionInfo: { gender: genderVal },
    auditionGrades: { vocal: data['Vocal Score'], acting: data['Acting Score'], dance: data['Dance Score'] },
    // 🟢 NEW COMPLIANCE MAPPINGS
    paidFees: !!data['Paid Fees'],
    measurementsTaken: !!data['Measurements Taken'],
    signedAgreement: !!data['Commitment to Character'],
    headshotSubmitted: hasHeadshot
  };
});
export const RosterListSchema = z.array(RosterStudentSchema);


// ==================================
//    ASSIGNMENTS SCHEMA (Table 603)
// ==================================
const RawAssignmentSchema = z.object({
  id: z.number(),
  'Performance Identity': BaserowArrayField(BaserowLinkSchema),
  'Person': BaserowArrayField(BaserowLinkSchema),
  'Production': BaserowArrayField(BaserowLinkSchema),
  'Scene Assignments': BaserowArrayField(BaserowLinkSchema),
}).passthrough();

export const AssignmentSchema = RawAssignmentSchema.transform(data => ({
  id: data.id,
  role: data['Performance Identity'].map(r => ({ ...r, value: typeof r.value === 'string' ? r.value : r.value?.value })),
  person: data['Person'].map(p => ({ ...p, value: typeof p.value === 'string' ? p.value : p.value?.value })),
  production: data['Production'],
  savedScenes: data['Scene Assignments'],
  _pendingScenes: null, 
}));
export const AssignmentListSchema = z.array(AssignmentSchema);
// ==================================
//  COMMITTEE PREFS SCHEMA (Table 620)
// ==================================
const RawCommitteeSchema = z.object({
  id: z.number(),
  'Parent/Guardian Name': z.any(),
  'Email': z.any(),
  'Phone': z.any(),
  'Student Name': z.any(), // Lookup field
  'Pre-Show 1st': z.any(),
  'Pre-Show 2nd': z.any(),
  'Pre-Show 3rd': z.any(),
  'Show Week 1st': z.any(),
  'Show Week 2nd': z.any(),
  'Show Week 3rd': z.any(),
}).passthrough();

export const CommitteePrefSchema = RawCommitteeSchema.transform(data => {
  // Safely extract the lookup value for student name
  let studentName = "";
  if (Array.isArray(data['Student Name']) && data['Student Name'].length > 0) {
     studentName = typeof data['Student Name'][0]?.value === 'string' 
        ? data['Student Name'][0].value 
        : (data['Student Name'][0]?.value?.value || "");
  }

  return {
    id: data.id,
    name: data['Parent/Guardian Name'] || 'Unknown Parent',
    email: data.Email || '',
    phone: data.Phone || '',
    studentName: studentName,
    // Safely extract single select values
    preShow1: data['Pre-Show 1st']?.value || null,
    preShow2: data['Pre-Show 2nd']?.value || null,
    preShow3: data['Pre-Show 3rd']?.value || null,
    showWeek1: data['Show Week 1st']?.value || null,
    showWeek2: data['Show Week 2nd']?.value || null,
    showWeek3: data['Show Week 3rd']?.value || null,
  };
});

export const CommitteeListSchema = z.array(CommitteePrefSchema);
