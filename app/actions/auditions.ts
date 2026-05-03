// app/actions/auditions.ts
"use server";

import { fetchBaserow, DB, getTenantTableConfig, getShowById } from "@/app/lib/baserow";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const tables = await getTenantTableConfig(tenant);
    
    // 1. RESOLVE STUDENT IDENTITY
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

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
      personId = existingStudents[0].id;
      const updatePayload: any = {
        [DB.PEOPLE.FIELDS.DATE_OF_BIRTH]: formData.dob || null,
        [DB.PEOPLE.FIELDS.HEIGHT_TOTAL_INCHES]: heightInches,
        [DB.PEOPLE.FIELDS.HEADSHOT]: formData.headshotUrl 
      };
      await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/${personId}/`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });
    } else {
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

    let slotLabel = "your scheduled time";
    let slotDateTime = "";
    if (formData.auditionSlotId) {
      const slotData = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/${formData.auditionSlotId}/`);
      if (slotData && !slotData.error) {
        slotLabel = slotData[DB.AUDITION_SLOTS.FIELDS.TIME_LABEL] || slotLabel;
        slotDateTime = slotData[DB.AUDITION_SLOTS.FIELDS.DATE_TIME] || "";
      }
    }

    const conflictString = Object.entries(formData.conflicts || {})
       .filter(([key, val]: any) => val.level !== "available")
       .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
       .join("\n");

    const extraDataString = `Grade: ${formData.grade || 'N/A'}\nSex: ${formData.sex || 'N/A'}\nHair: ${formData.hairColor || 'N/A'}\nHeight: ${formData.heightFt}'${formData.heightIn}"\nRoles: ${formData.preferredRoles || 'N/A'} (Accept Any: ${formData.acceptAnyRole ? 'Yes' : 'No'})\nOff-Book: ${formData.offBookAgreement ? 'Yes' : 'No'}\nParent Help: ${formData.parentCommitteeAgreement ? 'Yes' : 'No'}\nSignatures: ${formData.studentSignature} (S), ${formData.parentSignature} (P)`;

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify({
        [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
        [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
        [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString().split('T')[0], 
        [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle || "None",
        [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: formData.auditionSlotId ? [parseInt(formData.auditionSlotId)] : [], 
        // 🟢 FIXED: Headshot is successfully REMOVED from the Audition Payload so Baserow won't crash!
        [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `${extraDataString}\n\nConflicts:\n${conflictString || "None"}\n\nTrack: ${formData.musicFileUrl || 'None'}`,
      })
    });

    if (!audition || audition.error) return { success: false, error: "Database rejected the audition record." };

    if (audition?.id) {
      try {
        const show = await getShowById(tenant, productionId);
        const showTitle = show?.title || "our upcoming show";
        await resend.emails.send({
          from: 'Casting Team <casting@open-backstage.org>',
          to: lookupEmail,
          subject: `✨ Audition Confirmed: ${firstName} for ${showTitle}!`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #2563eb; font-style: italic; text-transform: uppercase;">Wish Granted! 🌟</h2>
                <p style="font-size: 16px; color: #374151;">Hi there,</p>
                <p style="font-size: 16px; color: #374151;">This email confirms that <strong>${formData.fullName}</strong> is successfully registered to audition for <strong>${showTitle}</strong>.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Actor:</strong> ${formData.fullName}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${slotLabel}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Song:</strong> ${formData.songTitle || "Custom Track Uploaded"}</p>
                </div>
                <p style="font-size: 16px; color: #374151;">Break a leg!</p>
                <p style="font-size: 14px; color: #6b7280; font-weight: bold; text-transform: uppercase;">- The Casting Team</p>
            </div>`
        });
      } catch (emailError) { console.error("Email failed:", emailError); }
    }
    return { success: true, auditionId: audition?.id };
  } catch (error) {
    console.error("Submission Error:", error);
    return { success: false, error: "Submission failed." };
  }
}

export async function cancelAudition(tenant: string, auditionId: number) {
  try {
    const tables = await getTenantTableConfig(tenant);
    const response = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
      method: "DELETE"
    });
    if (response?.error) {
      return { success: false, error: "Database rejected the cancellation." };
    }
    return { success: true };
  } catch (error) {
    console.error("Cancellation Error:", error);
    return { success: false, error: "Failed to cancel audition." };
  }
}

// 🟢 NEW FUNCTION: Saves the director's scores from the ScoringSidebar
export async function saveAuditionScore(
  tenant: string, 
  auditionId: number, 
  scores: { vocal: number; acting: number; dance: number; presence: number; notes: string }, 
  judgeRole: string
) {
  try {
    const tables = await getTenantTableConfig(tenant);

    let notesField = DB.AUDITIONS.FIELDS.ACTING_NOTES;
    if (judgeRole === "Music") notesField = DB.AUDITIONS.FIELDS.MUSIC_NOTES;
    if (judgeRole === "Drop-In") notesField = DB.AUDITIONS.FIELDS.DROP_IN_NOTES;
    if (judgeRole === "Admin") notesField = DB.AUDITIONS.FIELDS.ADMIN_NOTES;

    const payload: any = {
      [DB.AUDITIONS.FIELDS.VOCAL_SCORE]: scores.vocal,
      [DB.AUDITIONS.FIELDS.ACTING_SCORE]: scores.acting,
      [DB.AUDITIONS.FIELDS.DANCE_SCORE]: scores.dance,
    };

    if (scores.notes !== undefined) {
       payload[notesField] = scores.notes;
    }

    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify(payload)
    });

    if (!res || res.error) {
       console.error("Failed to save score:", res);
       return { success: false, error: "Database rejected the score." };
    }

    return { success: true };
  } catch (error) {
    console.error("Scoring Error:", error);
    return { success: false, error: "Failed to connect to database." };
  }
}