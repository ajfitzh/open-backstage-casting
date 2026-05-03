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
        [DB.PEOPLE.FIELDS.STATUS]: ["Guest"], // Kept as Guest until they set a password later!
      };
      
      const newPerson = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
        method: "POST",
        body: JSON.stringify(newPersonPayload)
      });
      personId = newPerson.id;
    }

    // 2. Submit the Audition Record
    const auditionPayload: any = {
      [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
      [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
      [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString(),
      [DB.AUDITIONS.FIELDS.GENDER]: { value: formData.sex || "Unknown" },
      [DB.AUDITIONS.FIELDS.HEIGHT]: `${formData.heightFt}'${formData.heightIn}"`,
      [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle,
      [DB.AUDITIONS.FIELDS.CONFLICTS]: JSON.stringify(formData.conflicts),
      "Audition Slot": formData.auditionSlotId ? [formData.auditionSlotId] : [], 
    };

    if (formData.headshotUrl) auditionPayload["Headshot URL"] = formData.headshotUrl;
    if (formData.musicFileUrl) auditionPayload["Audio Track URL"] = formData.musicFileUrl;

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify(auditionPayload)
    });

    // 🟢 3. SEND THE CONFIRMATION EMAIL
    if (audition?.id) {
      try {
        // Fetch the show title dynamically for the email subject
        const show = await getShowById(tenant, productionId);
        const showTitle = show?.title || "our upcoming show";
        const firstName = formData.fullName.split(' ')[0];

        await resend.emails.send({
          from: 'Open Backstage <onboarding@resend.dev>', // See note below about domain verification
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
        // We log the error but DO NOT fail the function, because the Baserow save was successful!
        console.error("Email failed to send, but audition was saved:", emailError);
      }
    }

    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Failed to submit audition:", error);
    return { success: false, error: "Submission failed" };
  }
}