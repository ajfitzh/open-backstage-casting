import { z } from 'zod';

// We accept any object structure from Baserow and extract exactly what we need.
// Since we pass user_field_names=true, we use the actual column headers!
const RawPersonSchema = z.object({
  id: z.number(),
  'First Name': z.any(),
  'Last Name': z.any(),
  'Full Name': z.any(),
  'Status': z.any(), // The critical field
  'CYT Account Personal Email': z.any(),
  'CYT National Individual Email': z.any(),
  'Phone Number': z.any(),
  'Headshot': z.any(),
  'Address': z.any(),
  'City': z.any(),
  'Families': z.any(),
}).passthrough();

export const UserProfileSchema = RawPersonSchema.transform(data => {
    // 1. Safely extract emails
    const personalEmail = typeof data['CYT Account Personal Email'] === 'string' ? data['CYT Account Personal Email'] : '';
    const nationalEmail = typeof data['CYT National Individual Email'] === 'string' ? data['CYT National Individual Email'] : '';
    const email = personalEmail || nationalEmail || '';

    // 2. Safely extract Roles from the Status Multiple Select
    let roles: string[] = ['Guest'];
    if (Array.isArray(data.Status) && data.Status.length > 0) {
        // Map over the array of objects [{id: 1, value: "Admin", color: "blue"}, ...]
        roles = data.Status.map(s => s.value).filter(Boolean);
    }

    // 3. Determine Primary Role for RBAC checks
    const primaryRole = roles.includes('Admin') ? 'Admin' 
                      : roles.includes('Executive Director') ? 'Executive Director'
                      : roles.includes('Education Coordinator') ? 'Education Coordinator'
                      : roles[0] || 'Guest';

    // 4. Safely extract Headshot URL
    let avatarUrl = null;
    if (Array.isArray(data.Headshot) && data.Headshot.length > 0) {
       const firstItem = data.Headshot[0];
       if (Array.isArray(firstItem) && firstItem.length > 0 && firstItem[0].url) avatarUrl = firstItem[0].url;
       else if (firstItem.url) avatarUrl = firstItem.url;
    }

    return {
        id: data.id.toString(),
        name: data['Full Name'] || `${data['First Name'] || ''} ${data['Last Name'] || ''}`.trim(),
        email: email,
        phone: data['Phone Number'] || null,
        address: `${data.Address || ''}, ${data.City || ''}`.replace(/^, |, $/g, ''),
        role: primaryRole,
        tags: roles, // Keep the full array for the Kanban board
        image: avatarUrl,
        familyId: data.Families?.[0]?.id || null, // Might be 'Families' or 'Family' depending on the table
    };
});

export const UserProfileListSchema = z.array(UserProfileSchema);
