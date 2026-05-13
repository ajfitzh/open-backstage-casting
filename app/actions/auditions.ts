// app/actions/auditions.ts
"use server";

import { Resend } from 'resend';
import { getShowById, fetchBaserow, getDB } from "@/app/lib/baserow";
import { getTenantTableConfig } from "@/app/lib/tenant-config";

const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Save the Program Bio (AUDITIONS table)
export async function saveStudentBio(tenant: string, auditionId: number, bio: string) {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.AUDITIONS.FIELDS;
    
    return await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
        method: "PATCH",
        body: JSON.stringify({ [F.PROGRAM_BIO]: bio })
    }, {}, tenant);
}

// 2. Save the Congrats Ad (AUDITIONS table)
export async function saveCongratsAd(tenant: string, auditionId: number, adText: string) {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.AUDITIONS.FIELDS;
    
    return await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
        method: "PATCH",
        body: JSON.stringify({ [F.CONGRATS_AD_TEXT]: adText })
    }, {}, tenant);
}

// 3. Update Tickets Sold (COMMITTEE_PREFS table)
export async function saveTicketsSold(tenant: string, studentId: number, productionId: number, tickets: number) {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);
    const F = DB.COMMITTEE_PREFS.FIELDS;

    const params = {
        filter_type: "AND",
        [`filter__${F.STUDENT_ID}__link_row_has`]: studentId,
        [`filter__${F.PRODUCTION}__link_row_has`]: productionId
    };
    
    const rows = await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/`, {}, params, tenant);
    
    if (Array.isArray(rows) && rows.length > 0) {
        const rowId = rows[0].id;
        return await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/${rowId}/`, {
            method: "PATCH",
            body: JSON.stringify({ [F.TICKETS_SOLD]: tickets })
        }, {}, tenant);
    }
    return { error: "Committee Pref row not found" };
}

export async function submitRealAudition(tenant: string, productionId: number, formData: any, lookupEmail: string) {
  try {
    const DB = getDB(tenant);
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
    
    const existingStudents = await fetchBaserow(`/database/rows/table/${tables.PEOPLE}/`, {}, studentSearchParams, tenant);
    
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
      }, {}, tenant);
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
      }, {}, tenant);
      if (!newPerson || Array.isArray(newPerson) || !newPerson.id) {
        throw new Error("Failed to create student record. Ensure Headshot is a URL field in Baserow.");
      }
      personId = newPerson.id;
    }

    let slotLabel = "your scheduled time";
    let slotDateTime = "";
    if (formData.auditionSlotId) {
      const slotData = await fetchBaserow(`/database/rows/table/${tables.AUDITION_SLOTS}/${formData.auditionSlotId}/`, {}, {}, tenant);
      if (slotData && !slotData.error) {
        slotLabel = slotData[DB.AUDITION_SLOTS.FIELDS.TIME_LABEL] || slotLabel;
        slotDateTime = slotData[DB.AUDITION_SLOTS.FIELDS.DATE_TIME] || "";
      }
    }

    const conflictString = Object.entries(formData.conflicts || {})
       .filter(([key, val]: any) => val.level !== "available")
       .map(([key, val]: any) => `${key}: ${val.level} (${val.notes || "No notes"})`)
       .join("\n");

    // 🟢 V2 UPDATE: WE PACKED ROMANCE & VOCAL RANGE IN HERE FOR YOU
    const extraDataString = `Grade: ${formData.grade || 'N/A'}
Roles: ${formData.preferredRoles || 'N/A'}
Vocal Range: ${formData.vocalRange || 'Unsure'}
Stage Romance: ${formData.acceptRomance ? 'Yes' : 'No'}
Callbacks: ${formData.callbackStatus || 'No Answer'}
Chair Interest: ${formData.chairInterest || 'No'}`;

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
        [DB.AUDITIONS.FIELDS.VOCAL_RANGE]: formData.vocalRange || "Unsure",
        [DB.AUDITIONS.FIELDS.GRADE]: formData.grade || null,

        // 🟢 THE NEW "REAL FIX" FIELDS (You must create these in Baserow)
        [DB.AUDITIONS.FIELDS.PREFERRED_ROLES]: formData.preferredRoles || "",
        [DB.AUDITIONS.FIELDS.STAGE_ROMANCE]: formData.acceptRomance || false,
        [DB.AUDITIONS.FIELDS.CALLBACK_STATUS]: formData.callbackStatus || "",

        // 🟢 THE FORGOTTEN FIELDS (Already in your DB)
        [DB.AUDITIONS.FIELDS.WILLING_TO_ALTER_APPEARANCE]: formData.willingToAlterAppearance || false,
        [DB.AUDITIONS.FIELDS.FEAR_OF_HEIGHTS]: formData.fearOfHeights || false,
        [DB.AUDITIONS.FIELDS.OTHER_TALENTS]: formData.otherTalents || "",

        [DB.AUDITIONS.FIELDS.ADMIN_NOTES]: `Conflicts:\n${conflictString || "None"}`,
      })
    }, {}, tenant);

    if (!audition || audition.error) return { success: false, error: "Database rejected the audition record." };

    // ==========================================
    // WRITE TO COMMITTEE_PREFS TABLE
    // ==========================================
    if (audition?.id && tables.COMMITTEE_PREFS) {
      try {
        const prefsPayload: any = {
          [DB.COMMITTEE_PREFS.FIELDS.PRODUCTION]: [productionId],
          [DB.COMMITTEE_PREFS.FIELDS.STUDENT_ID]: [parseInt(personId)], 
          [DB.COMMITTEE_PREFS.FIELDS.IS_CHAIR]: formData.chairInterest === "yes" ? true : false,
        };

        if (formData.preShow1) prefsPayload[DB.COMMITTEE_PREFS.FIELDS.PRE_SHOW_1ST] = formData.preShow1;
        if (formData.preShow2) prefsPayload[DB.COMMITTEE_PREFS.FIELDS.PRE_SHOW_2ND] = formData.preShow2;
        if (formData.preShow3) prefsPayload[DB.COMMITTEE_PREFS.FIELDS.PRE_SHOW_3RD] = formData.preShow3;
        if (formData.show1) prefsPayload[DB.COMMITTEE_PREFS.FIELDS.SHOW_WEEK_1ST] = formData.show1;
        if (formData.show2) prefsPayload[DB.COMMITTEE_PREFS.FIELDS.SHOW_WEEK_2ND] = formData.show2;
        if (formData.show3) prefsPayload[DB.COMMITTEE_PREFS.FIELDS.SHOW_WEEK_3RD] = formData.show3;

        await fetchBaserow(`/database/rows/table/${tables.COMMITTEE_PREFS}/`, {
          method: "POST",
          body: JSON.stringify(prefsPayload)
        }, {}, tenant);
      } catch (committeeError) {
        console.error("Failed to save Committee Prefs:", committeeError);
      }
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
    }, {}, tenant);
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
    const DB = getDB(tenant);
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
    }, {}, tenant);

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
  parentEmail: string,
  signatures: string 
) {
  try {
    const DB = getDB(tenant);
    const tables = await getTenantTableConfig(tenant);

    const payload = {
      [DB.AUDITIONS.FIELDS.SIGNATURES]: signatures
    };

    const res = await fetchBaserow(`/database/rows/table/${tables.AUDITIONS}/${auditionId}/`, {
       method: "PATCH",
       body: JSON.stringify(payload)
    }, {}, tenant);

    if (!res || res.error) {
       console.error("Failed to update signatures:", res);
       return { success: false, error: "Database rejected the signature update." };
    }

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || 'Casting Team <casting@open-backstage.org>',
        to: parentEmail,
        subject: `🎭 Role Accepted: ${studentName} in ${showTitle}!`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: #059669; font-style: italic; text-transform: uppercase;">Welcome to the Cast! 🎉</h2>
              <p style="font-size: 16px; color: #374151;">Hi there,</p>
              <p style="font-size: 16px; color: #374151;">This email confirms that you have officially accepted the role of <strong>${roleName}</strong> for <strong>${studentName}</strong> in our upcoming production of <em>${showTitle}</em>.</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Digital Agreements Confirmed:</h3>
                  <ul style="margin: 0; color: #4b5563; font-size: 14px;">
                     <li>✅ Student Conduct Agreement</li>
                     <li>✅ Parent Committee & Medical Release</li>
                     <li>✅ Non-Refundable Production Fee Policy</li>
                     <li>✅ Attendance & Illness Policy</li>
                  </ul>
              </div>

              <p style="font-size: 16px; color: #374151;"><strong>Next Steps:</strong> Check your Family Hub for the official rehearsal schedule and to submit your program bio!</p>
              
              <p style="font-size: 16px; color: #374151;">We can't wait to get started!</p>
              <p style="font-size: 14px; color: #6b7280; font-weight: bold; text-transform: uppercase;">- The Directing Team</p>
          </div>`
      });
    } catch (emailError) { 
      console.error("Welcome Email failed:", emailError); 
    }

    return { success: true };
  } catch (error) {
    console.error("Acceptance Error:", error);
    return { success: false, error: "Failed to connect to the database." };
  }
}