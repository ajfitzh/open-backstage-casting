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

    const extraDataString = `Grade: ${formData.grade || 'N/A'}\nRoles: ${formData.preferredRoles || 'N/A'}`;

    const audition = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/`, {
      method: "POST",
      body: JSON.stringify({
        [DB.AUDITIONS.FIELDS.PERFORMER]: [parseInt(personId)],
        [DB.AUDITIONS.FIELDS.PRODUCTION]: [productionId],
        [DB.AUDITIONS.FIELDS.DATE]: new Date().toISOString().split('T')[0], 
        [DB.AUDITIONS.FIELDS.SONG]: formData.songTitle || "None",
        [DB.AUDITIONS.FIELDS.AUDITION_SLOTS]: formData.auditionSlotId ? [parseInt(formData.auditionSlotId)] : [], 
        
        [DB.AUDITIONS.FIELDS.HAIR_COLOR]: formData.hairColor || "",
        [DB.AUDITIONS.FIELDS.ACCEPT_ANY_ROLE]: formData.acceptAnyRole || false,
        [DB.AUDITIONS.FIELDS.OFF_BOOK_AGREEMENT]: formData.offBookAgreement || false,
        [DB.AUDITIONS.FIELDS.PARENT_HELP_AGREEMENT]: formData.parentCommitteeAgreement || false,
        [DB.AUDITIONS.FIELDS.SIGNATURES]: `${formData.studentSignature} (S), ${formData.parentSignature} (P)`,
        [DB.AUDITIONS.FIELDS.BACKING_TRACK]: formData.practiceAudio || formData.musicFileUrl || "",

        [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `${extraDataString}\n\nConflicts:\n${conflictString || "None"}`,
      })
    });

    if (!audition || audition.error) return { success: false, error: "Database rejected the audition record." };

    // ==========================================
    // 🟢 NEW: WRITE TO COMMITTEE_PREFS TABLE
    // ==========================================
    if (audition?.id && tables.COMMITTEE_PREFS) {
      try {
        await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/`, {
          method: "POST",
          body: JSON.stringify({
            [DB.COMMITTEE_PREFS.FIELDS.PRODUCTION]: [productionId],
            [DB.COMMITTEE_PREFS.FIELDS.STUDENT_NAME]: formData.fullName,
            [DB.COMMITTEE_PREFS.FIELDS.EMAIL]: lookupEmail,
            [DB.COMMITTEE_PREFS.FIELDS.PRE_SHOW_1ST]: formData.preShow1 || "",
            [DB.COMMITTEE_PREFS.FIELDS.PRE_SHOW_2ND]: formData.preShow2 || "",
            [DB.COMMITTEE_PREFS.FIELDS.PRE_SHOW_3RD]: formData.preShow3 || "",
            [DB.COMMITTEE_PREFS.FIELDS.SHOW_WEEK_1ST]: formData.show1 || "",
            [DB.COMMITTEE_PREFS.FIELDS.SHOW_WEEK_2ND]: formData.show2 || "",
            [DB.COMMITTEE_PREFS.FIELDS.SHOW_WEEK_3RD]: formData.show3 || "",
            [DB.COMMITTEE_PREFS.FIELDS.IS_CHAIR]: formData.willingToChair || false,
            // You can append chairPreference string to a notes column if your schema has one, 
            // e.g.: [DB.COMMITTEE_PREFS.FIELDS.NOTES]: formData.chairPreference || ""
          })
        });
      } catch (committeeError) {
        console.error("Failed to save Committee Prefs:", committeeError);
      }
    }
    // ==========================================

    if (audition?.id) {
      try {
        const show = await getShowById(tenant, productionId);
        const showTitle = show?.title || "our upcoming show";

        let practiceMaterialsHtml = "";
        if (formData.practiceKaraoke || formData.practiceLyrics) {
          practiceMaterialsHtml = `
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
              <h3 style="color: #1e3a8a; margin-top: 0;">🎤 Practice Materials</h3>
              <p style="font-size: 14px; color: #1e40af; margin-bottom: 10px;">Since you selected an easy-start song, here are your links to practice!</p>
              ${formData.practiceKaraoke ? `<p style="margin: 5px 0;"><a href="${formData.practiceKaraoke}" style="color: #2563eb; font-weight: bold; text-decoration: none;">▶️ YouTube Karaoke Track</a></p>` : ''}
              ${formData.practiceLyrics ? `<p style="margin: 5px 0;"><a href="${formData.practiceLyrics}" style="color: #2563eb; font-weight: bold; text-decoration: none;">📄 Sheet Music / Lyrics</a></p>` : ''}
            </div>
          `;
        }

        await resend.emails.send({
          from: 'Casting Team <casting@open-backstage.org>',
          to: lookupEmail,
          subject: `🎉 Audition Confirmed: ${firstName} for ${showTitle}!`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #2563eb; font-style: italic; text-transform: uppercase;">Wish Granted! ✨</h2>
                <p style="font-size: 16px; color: #374151;">Hi there,</p>
                <p style="font-size: 16px; color: #374151;">This email confirms that <strong>${formData.fullName}</strong> is successfully registered to audition for <strong>${showTitle}</strong>.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Actor:</strong> ${formData.fullName}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${slotLabel}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Song:</strong> ${formData.songTitle || "Custom Track Uploaded"}</p>
                </div>

                ${practiceMaterialsHtml}

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

export async function acceptRoleAndSign(
  tenant: string, 
  auditionId: number, 
  studentName: string, 
  roleName: string, 
  showTitle: string, 
  parentEmail: string
) {
  try {
    const tables = await getTenantTableConfig(tenant);

    // 1. UPDATE BASEROW
    // Overwrite the signature field with the explicit digital click-wrap confirmation
    const payload = {
      [DB.AUDITIONS.FIELDS.SIGNATURES]: "Agreed via Click (S), Agreed via Click (P)"
    };

    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify(payload)
    });

    if (!res || res.error) {
       console.error("Failed to update signatures:", res);
       return { success: false, error: "Database rejected the signature update." };
    }

    // 2. SEND "WELCOME TO THE CAST" EMAIL
    try {
      await resend.emails.send({
        from: 'Casting Team <casting@open-backstage.org>',
        to: parentEmail,
        subject: `🎭 Role Accepted: ${studentName} in ${showTitle}!`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: #059669; font-style: italic; text-transform: uppercase;">Welcome to the Cast! 🎉</h2>
              <p style="font-size: 16px; color: #374151;">Hi there,</p>
              <p style="font-size: 16px; color: #374151;">This email confirms that you have officially accepted the role of <strong>${roleName}</strong> for <strong>${studentName}</strong> in our upcoming production of <em>${showTitle}</em>.</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Digital Agreements Confirmed:</h3>
                  <ul style="margin: 0; color: #4b5563; font-size: 14px;">
                     <li>✅ Medical & Liability Release</li>
                     <li>✅ CYT Code of Conduct</li>
                     <li>✅ Parent Committee Agreement</li>
                  </ul>
              </div>

              <p style="font-size: 16px; color: #374151;"><strong>Next Steps:</strong> Check your Family Hub for the official rehearsal schedule and to submit your program bio!</p>
              
              <p style="font-size: 16px; color: #374151;">We can't wait to get started!</p>
              <p style="font-size: 14px; color: #6b7280; font-weight: bold; text-transform: uppercase;">- The Directing Team</p>
          </div>`
      });
    } catch (emailError) { 
      // We don't fail the whole function if the email blips, the DB update is the critical part
      console.error("Welcome Email failed:", emailError); 
    }

    return { success: true };
  } catch (error) {
    console.error("Acceptance Error:", error);
    return { success: false, error: "Failed to connect to the database." };
  }
}

// Add to bottom of app/actions/auditions.ts

export async function saveStudentBio(tenant: string, auditionId: number, bioText: string) {
  try {
    const tables = await getTenantTableConfig(tenant);

    // Ensure you have a 'Program Bio' (or similarly named) Long Text field in your Auditions table in Baserow
    const payload = {
      // NOTE: Update this field name to exactly match what you name it in Baserow!
      "Program Bio": bioText
    };

    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify(payload)
    });

    if (!res || res.error) {
       console.error("Failed to update bio:", res);
       return { success: false, error: "Database rejected the bio update." };
    }

    return { success: true };
  } catch (error) {
    console.error("Bio Save Error:", error);
    return { success: false, error: "Failed to connect to the database." };
  }
}