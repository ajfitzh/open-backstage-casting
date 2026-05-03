// app/actions/auditions.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig, getShowById } from "@/app/lib/baserow";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. Separate the performer's name
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

// 🟢 CRITICAL FIX: Require the email to match to prevent strangers from overwriting kids
    // or exposing audition times to unauthorized parents.
    const studentSearchParams = {
      filter_type: "AND",
      [`filter__${DB.PEOPLE.FIELDS.FIRST_NAME}__equal`]: firstName,
      [`filter__${DB.PEOPLE.FIELDS.LAST_NAME}__equal`]: lastName,
      [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: lookupEmail,
    };
    
    const existingStudents = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, studentSearchParams);
    
    let personId;
    
    // Calculate total height in inches for the Master Database
    const heightInches = (parseInt(formData.heightFt) || 0) * 12 + (parseInt(formData.heightIn) || 0);

    if (existingStudents && existingStudents.length > 0) {
      // 🟢 EXISTING KID: Grab their ID and UPDATE their master profile!
      personId = existingStudents[0].id;
      
      const updatePayload: any = {
        [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
        [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches
      };

      // Baserow can automatically pull in an image if we pass it a public URL!
      if (formData.headshotUrl && !formData.headshotUrl.startsWith('data:')) {
          updatePayload[DB.PEOPLE.FIELDS.HEADSHOT] = [{ url: formData.headshotUrl }];
      }

      await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${personId}/`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });

    } else {
      // 🟢 NEW KID: Create them from scratch
      const newPersonPayload: any = {
        [DB.PEOPLE.FIELDS.FIRST_NAME]: firstName,
        [DB.PEOPLE.FIELDS.LAST_NAME]: lastName,
        [DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL]: lookupEmail,
        [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
        [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches,
        [DB.PEOPLE.FIELDS.STATUS]: ["Guest"], 
      };

      if (formData.headshotUrl && !formData.headshotUrl.startsWith('data:')) {
          newPersonPayload[DB.PEOPLE.FIELDS.HEADSHOT] = [{ url: formData.headshotUrl }];
      }
      
      const newPerson = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {
        method: "POST",
        body: JSON.stringify(newPersonPayload)
      });
      personId = newPerson.id;
    }

    // 2. Fetch the Slot details for the Calendar Invite
    let slotDateTime = "";
    let slotLabel = "your scheduled time";

    if (formData.auditionSlotId) {
      const slotData = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/${formData.auditionSlotId}/`);
      if (slotData && !slotData.error) {
        slotLabel = slotData[DB.AUDITION_SLOTS.FIELDS.TIME_LABEL] || slotLabel;
        slotDateTime = slotData[DB.AUDITION_SLOTS.FIELDS.DATE_TIME] || "";
      }
    }

    // 3. Format Conflicts
    const conflictString = Object.entries(formData.conflicts || {})
       .filter(([key, val]: any) => val.level !== "available")
       .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
       .join("\n");

    // 4. Submit the Audition Record
    const auditionPayload: any = {
      [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
      [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
      [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString().split('T')[0], 
      [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle || "None",
      [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: formData.auditionSlotId ? [parseInt(formData.auditionSlotId)] : [], 
      // We dump all the transient stuff here so Directors can easily read it
      [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `Height: ${formData.heightFt}'${formData.heightIn}"\nGender: ${formData.sex || 'N/A'}\n\nConflicts:\n${conflictString || "None"}\n\nTrack: ${formData.musicFileUrl || 'None'}`,
    };

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify(auditionPayload)
    });

    if (!audition || audition.error) {
        console.error("Baserow Error:", audition);
        return { success: false, error: "Database rejected the format." };
    }

    // 5. SEND THE CONFIRMATION EMAIL
    if (audition?.id) {
      try {
        const show = await getShowById(tenant, productionId);
        const showTitle = show?.title || "our upcoming show";

        let jsonLd = "";
        if (slotDateTime) {
            jsonLd = `
            <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "EventReservation",
              "reservationNumber": "AUD-${audition.id}",
              "reservationStatus": "http://schema.org/Confirmed",
              "underName": {
                "@type": "Person",
                "name": "${formData.fullName}"
              },
              "reservationFor": {
                "@type": "Event",
                "name": "Audition: ${showTitle}",
                "startDate": "${slotDateTime}",
                "location": {
                  "@type": "Place",
                  "name": "CYT Auditions"
                }
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
        console.error("Email failed to send, but audition was saved:", emailError);
      }
    }

    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Failed to submit audition:", error);
    return { success: false, error: "Submission failed" };
  }
}

// Ensure getExistingAuditions is at the bottom of this file!
export async function getExistingAuditions(tenant: string, email: string, productionId: number) {
  if (!email) return [];
  try {
    const tables = await getTenantTableConfig(tenant);
    if (!tables.PEOPLE || !tables.AUDITIONS) return [];

    const people = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, {
      filter_type: "AND",
      [`filter__${DB.PEOPLE.FIELDS.CYT_ACCOUNT_PERSONAL_EMAIL}__equal`]: email
    });

    if (!people || people.length === 0) return [];
    const peopleIds = people.map((p: any) => p.id).join(',');

    const auditions = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {}, {
      filter_type: "AND",
      [`filter__${DB.AUDITIONS.FIELDS.PRODUCTION}__link_row_has`]: productionId,
      [`filter__${DB.AUDITIONS.FIELDS.PERFORMER}__link_row_has_any`]: peopleIds
    });

    if (!auditions || !Array.isArray(auditions)) return [];

    return auditions.map((a: any) => ({
      id: a.id,
      name: a[DB.AUDITIONS.FIELDS.PERFORMER]?.[0]?.value || "Student",
      time: a[DB.AUDITIONS.FIELDS.AUDITION_SLOTS]?.[0]?.value || "Pending Time",
      song: a[DB.AUDITIONS.FIELDS.SONG] || "No Song Selected"
    }));
  } catch (error) {
    console.error("Failed to fetch existing auditions:", error);
    return [];
  }
}