import { z } from 'zod';

// Schema for the raw data from the Baserow 'People' table
const RawPersonSchema = z.object({
  id: z.number(),
  'field_5736': z.string().nullish(), // First Name
  'field_5737': z.string().nullish(), // Last Name
  'field_5735': z.string().nullish(), // Full Name (Formula)
  'field_5782': z.array(z.object({ value: z.string() })).nullish(), // Status (Multiple Select)
  'field_6132': z.string().email().nullish(), // Email (Personal)
  'field_6131': z.string().email().nullish(), // Email (National)
  'field_5776': z.array(z.object({ url: z.string() })).nullish(), // Headshot
});

// A schema that transforms the raw, messy data into a clean UserProfile object
export const UserProfileSchema = RawPersonSchema.transform(data => {
    const email = data['field_6132'] || data['field_6131'] || '';
    const roles = data['field_5782']?.map(s => s.value) || ['Guest'];
    // Prioritize more powerful roles if a user has multiple
    const primaryRole = roles.includes('Admin') ? 'Admin'
                      : roles.includes('Executive Director') ? 'Executive Director'
                      : roles[0] || 'Guest';

    return {
        id: data.id.toString(),
        name: data['field_5735'] || `${data['field_5736'] || ''} ${data['field_5737'] || ''}`.trim(),
        email: email,
        image: data['field_5776']?.[0]?.url || null,
        role: primaryRole,
    };
});

// This schema is for validating a list of people
export const UserProfileListSchema = z.array(UserProfileSchema);
