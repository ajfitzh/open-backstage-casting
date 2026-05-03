// app/actions/auditions.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig, getShowById } from "@/app/lib/baserow";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Handles the submission of a real audition.
 * 1. Finds or creates the student in the PEOPLE table.
 * 2. Updates their profile with latest growth/headshot info.
 * 3. Creates the audition record.
 * 4. Sends a confirmation email via Resend.
 */
export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. RESOLVE STUDENT IDENTITY
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

    // 🟢 CRITICAL: Email match is required to prevent unauthorized data overwriting.
    const studentSearchParams = {
      filter_type: "AND",
      [`filter__${DB.PEOPLE.FIELDS.FIRST_NAME}__equal`]: firstName,
      [`filter__${DB.PEOPLE.FIELDS.LAST_NAME}__equal`]: lastName,
      [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: lookupEmail,
    };
    
    const existingStudents = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, studentSearchParams);
    
    let personId;
    const heightInches = (parseInt(formData.heightFt) || 0) * 12 + (parseInt(formData.heightIn) || 0);

    if (existingStudents && existingStudents.length > 0) {
      // EXISTING STUDENT: Update their profile with latest info
      personId = existingStudents[0].id;
      
      const updatePayload: any = {
        [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
        [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches,
        // 🟢 HEADSHOT AS URL: Works if field_5776 is changed to "URL" type in Baserow
        [DB.PEOPLE.FIELDS.HEADSHOT]: formData.headshotUrl 
      };

      await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${personId}/`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });

    } else {
      // NEW STUDENT: Create a fresh profile
      const newPerson = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
        method: "POST",
        body: JSON.stringify({
          [DB.PEOPLE.FIELDS.FIRST_NAME]: firstName,
          [DB.PEOPLE.FIELDS.LAST_NAME]: lastName,
          [DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL]: lookupEmail,
          [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
          [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches,
          [DB.PEOPLE.FIELDS.HEADSHOT]: formData.headshotUrl,
          [DB.PEOPLE.FIELDS.STATUS]: ["Guest"], 
        })
      });

      if (!newPerson || Array.isArray(newPerson) || !newPerson.id) {
        throw new Error("Failed to create student record. Ensure Headshot is a URL field in Baserow.");
      }
      personId = newPerson.id;
    }

    // 2. FETCH SLOT DETAILS FOR EMAIL
    let slotLabel = "your scheduled time";
    let slotDateTime = "";
    if (formData.auditionSlotId) {
      const slotData = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/${formData.auditionSlotId}/`);
      if (slotData && !slotData.error) {
        slotLabel = slotData[DB.AUDITION_SLOTS.FIELDS.TIME_LABEL] || slotLabel;
        slotDateTime = slotData[DB.AUDITION_SLOTS.FIELDS.DATE_TIME] || "";
      }
    }

    // 3. FORMAT REHEARSAL CONFLICTS
    const conflictString = Object.entries(formData.conflicts || {})
       .filter(([key, val]: any) => val.level !== "available")
       .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
       .join("\n");

    // 4. SUBMIT THE AUDITION RECORD
    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify({
        [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
        [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
        [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString().split('T')[0], 
        [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle || "None",
        [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: formData.auditionSlotId ? [parseInt(formData.auditionSlotId)] : [], 
        [DB.AUDITIONS.FIELDS.HEADSHOT]: formData.headshotUrl, 
        // Keep Admin Notes clean for actual director scoring/feedback
        [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `Height: ${formData.heightFt}'${formData.heightIn}"\nGender: ${formData.sex || 'N/A'}\n\nConflicts:\n${conflictString || "None"}\n\nTrack: ${formData.musicFileUrl || 'None'}`,
      })
    });

    if (!audition || audition.error) {
        console.error("Audition POST failed:", audition);
        return { success: false, error: "Database rejected the audition record." };
    }

    // 5. SEND THE CONFIRMATION EMAIL
    if (audition?.id) {
      try {
        const show = await getShowById(tenant, productionId);
        const showTitle = show?.title || "our upcoming show";

        // Structured data for Google Calendar/Inbox
        let jsonLd = "";
        if (slotDateTime) {
            jsonLd = `
            <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "EventReservation",
              "reservationNumber": "AUD-${audition.id}",
              "reservationStatus": "http://schema.org/Confirmed",
              "underName": { "@type": "Person", "name": "${formData.fullName}" },
              "reservationFor": {
                "@type": "Event",
                "name": "Audition: ${showTitle}",
                "startDate": "${slotDateTime}",
                "location": { "@type": "Place", "name": "CYT Auditions" }
              }
            }
            </script>
            `;
        }

        await resend.emails.send({
          from: 'Casting Team <casting@open-backstage.org>',
          to: lookupEmail,
          subject: `✨ Audition Confirmed: ${firstName} for ${showTitle}!`,
          html: `
            ${jsonLd}
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #2563eb; font-style: italic; text-transform: uppercase;">Wish Granted! 🌟</h2>
                <p style="font-size: 16px; color: #374151;">Hi there,</p>
                <p style="font-size: 16px; color: #374151;">This email confirms that <strong>${formData.fullName}</strong> is successfully registered to audition for <strong>${showTitle}</strong>.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Actor:</strong> ${formData.fullName}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${slotLabel}</p>
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
        console.error("Audition saved, but email failed:", emailError);
      }
    }

    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Critical Submission Error:", error);
    return { success: false, error: "Submission failed. Please check your connection." };
  }
}