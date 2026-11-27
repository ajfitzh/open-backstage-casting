// app/actions/auditions.ts
"use server";

import { Resend } from 'resend';
import { getShowById } from "@/app/lib/baserow";
import {
  acceptRoleAndSignPg,
  cancelAuditionPg,
  saveAuditionScorePg,
  saveCongratsAdPg,
  saveStudentBioPg,
  saveTicketsSoldPg,
  submitRealAuditionPg,
} from "@/app/lib/db/casting-repo";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
  return new Resend(apiKey);
}

// 1. Save the Program Bio
export async function saveStudentBio(tenant: string, auditionId: number, bio: string) {
  return await saveStudentBioPg(tenant, auditionId, bio);
}

// 2. Save the Congrats Ad
export async function saveCongratsAd(tenant: string, auditionId: number, adText: string) {
  return await saveCongratsAdPg(tenant, auditionId, adText);
}

// 3. Update Tickets Sold
export async function saveTicketsSold(
  tenant: string,
  studentId: number,
  productionId: number,
  tickets: number
) {
  return await saveTicketsSoldPg(tenant, studentId, productionId, tickets);
}

export async function submitRealAudition(
  tenant: string,
  productionId: number,
  formData: any,
  lookupEmail: string
) {
  try {
    const pgRes = await submitRealAuditionPg(tenant, productionId, formData, lookupEmail);
    if (!pgRes.success) return { success: false, error: pgRes.error };

    let showTitle = "Our Upcoming Production";
    try {
      const showObj = await getShowById(tenant, productionId);
      if (showObj?.title) showTitle = showObj.title;
    } catch (e) {
      console.error("Could not fetch show title for email", e);
    }

    if (process.env.RESEND_API_KEY) {
      try {
        await getResend().emails.send({
          from: process.env.EMAIL_FROM_ADDRESS || 'Casting Team <casting@open-backstage.org>',
          to: lookupEmail,
          subject: `🎭 Audition Confirmed: ${pgRes.firstName} for ${showTitle}!`,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: #2563eb; font-style: italic; text-transform: uppercase;">You're on the list! 🌟</h2>
              <p style="font-size: 16px; color: #374151;">This email confirms that <strong>${pgRes.firstName} ${pgRes.lastName}</strong> is officially registered to audition for <em>${showTitle}</em>.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <ul style="margin: 0; color: #4b5563; font-size: 14px; list-style-type: none; padding-left: 0; line-height: 1.6;">
                  <li>🔢 <strong>Audition Number:</strong> ${pgRes.auditionNumber}</li>
                  <li>🕒 <strong>Time:</strong> ${pgRes.slotLabel}</li>
                  <li>🎵 <strong>Song:</strong> ${formData.songTitle || "None"}</li>
                </ul>
              </div>
              <p style="font-size: 16px; color: #374151;">Break a leg!</p>
            </div>`,
        });
      } catch (emailError) {
        console.error("Audition Confirmation Email failed:", emailError);
      }
    }

    return {
      success: true,
      auditionId: pgRes.auditionId,
      auditionNumber: pgRes.auditionNumber,
    };
  } catch (error) {
    console.error("Submission Error:", error);
    return { success: false, error: "Submission failed." };
  }
}

export async function cancelAudition(tenant: string, auditionId: number) {
  try {
    return await cancelAuditionPg(tenant, auditionId);
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
    return await saveAuditionScorePg(tenant, auditionId, scores, judgeRole);
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
    const pgRes = await acceptRoleAndSignPg(tenant, auditionId, signatures);
    if (!pgRes.success) return pgRes;

    try {
      await getResend().emails.send({
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
          </div>`,
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
