// app/actions/auditions.ts
"use server";

import { fetchBaserow, DB, findUserByEmail, getTenantTableConfig, getShowById } from "@/app/lib/baserow";
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Find or create the Person
    let personId;
    let person = await findUserByEmail(tenant, lookupEmail);
    
    if (person) {
      personId = person.id;
    } else {
      const nameParts = formData.fullName.split(' ');
      const newPersonPayload = {
        [DB.PEOPLE.FIELDS.FIRST_NAME]: nameParts[0],
        [DB.PEOPLE.FIELDS.LAST_NAME]: nameParts.slice(1).join(' '),
        [DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL]: lookupEmail,
        [DB.PEOPLE.FIELDS.STATUS]: ["Guest"], // Kept as Guest until they set a password!
      };
      
      const newPerson = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
        method: "POST",
        body: JSON.stringify(newPersonPayload)
      });
      personId = newPerson.id;
    }

    // 🟢 FORMAT CONFLICTS FOR READING
    // Turns the raw JSON into a clean list of dates they are late/absent
    const conflictString = Object.entries(formData.conflicts || {})
       .filter(([key, val]: any) => val.level !== "available")
       .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
       .join("\n");

    // 2. Submit the Audition Record
    // 🟢 CRITICAL FIX: Removed GENDER, HEIGHT, and CONFLICTS because they are LOOKUP fields!
    // Writing to a lookup field causes a 400 Bad Request error.
    const auditionPayload: any = {
      [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
      [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
      [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString().split('T')[0], 
      [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle || "None",
      
      // Use the exact schema ID for the Audition Slots linked field
      [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: formData.auditionSlotId ? [parseInt(formData.auditionSlotId)] : [], 
      
      // Dump all the extra form data safely into a text field so it doesn't crash the database!
      [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `Height: ${formData.heightFt}'${formData.heightIn}"\nGender: ${formData.sex || 'N/A'}\n\nConflicts:\n${conflictString || "None"}\n\nHeadshot: ${formData.headshotUrl || 'None'}\nTrack: ${formData.musicFileUrl || 'None'}`,
    };

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify(auditionPayload)
    });

    if (!audition || audition.error) {
        console.error("Baserow Error:", audition);
        return { success: false, error: "Database rejected the format." };
    }

    // 3. SEND THE CONFIRMATION EMAIL
    if (audition?.id) {
      try {
        const show = await getShowById(tenant, productionId);
        const showTitle = show?.title || "our upcoming show";
        const firstName = formData.fullName.split(' ')[0];

        // ⚠️ Don't forget to change this 'from' email to your verified Cloudflare domain!
        await resend.emails.send({
          from: 'Open Backstage <onboarding@resend.dev>', 
          to: lookupEmail,
          subject: `✨ Audition Confirmed: ${firstName} for ${showTitle}!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #2563eb; font-style: italic; text-transform: uppercase;">Wish Granted! 🌟</h2>
                <p style="font-size: 16px; color: #374151;">Hi there,</p>
                <p style="font-size: 16px; color: #374151;">This email confirms that <strong>${formData.fullName}</strong> is successfully registered to audition for <strong>${showTitle}</strong>.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Actor:</strong> ${formData.fullName}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Song:</strong> ${formData.songTitle || "Custom Track Uploaded"}</p>
                    <p style="margin: 0;"><strong>Height:</strong> ${formData.heightFt}'${formData.heightIn}"</p>
                </div>

                <p style="font-size: 16px; color: #374151;">We will have their music ready at the sound booth. Please arrive 15 minutes before your scheduled block.</p>
                <p style="font-size: 16px; color: #374151;">Break a leg!</p>
                <p style="font-size: 14px; color: #6b7280; font-weight: bold; text-transform: uppercase;">- The Casting Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error("Email failed to send, but audition was saved:", emailError);
      }
    }

    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Failed to submit audition:", error);
    return { success: false, error: "Submission failed" };
  }
}