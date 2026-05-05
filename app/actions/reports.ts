"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface NightlyReportPayload {
    emails: string[];
    eventName: string;
    date: string;
    absences: { name: string; status: string }[];
    scenes: string[];
    notes: string;
}

export async function sendNightlyReport(payload: NightlyReportPayload) {
  try {
    // 1. Build the dynamic HTML for Absences
    const absencesHtml = payload.absences.length === 0 
      ? `<p style="color: #059669; font-weight: bold;">✅ Perfect attendance today!</p>`
      : `<ul style="color: #374151;">
          ${payload.absences.map(a => `<li><strong>${a.name}</strong> - <em>${a.status}</em></li>`).join('')}
         </ul>`;

    // 2. Build the dynamic HTML for Scenes
    const scenesHtml = payload.scenes.length === 0
      ? `<p style="color: #6b7280;">No specific scenes recorded today.</p>`
      : `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${payload.scenes.map(s => `<span style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 14px;">${s}</span>`).join(' ')}
         </div>`;

    // 3. Format the Director's Notes (convert line breaks to HTML breaks)
    const formattedNotes = payload.notes.replace(/\n/g, '<br/>');

    // 4. Send the Email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM_ADDRESS || 'Stage Management <stage@open-backstage.org>',
      // Resend allows an array of up to 50 emails in the 'bcc' field for bulk sending
      bcc: payload.emails, 
      to: process.env.EMAIL_FROM_ADDRESS || 'stage@open-backstage.org', // Send a copy to the sender
      subject: `🎭 Nightly Rehearsal Report: ${payload.eventName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #2563eb; margin-bottom: 5px;">Director's Nightly Report</h2>
            <p style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">
              ${payload.eventName} • ${payload.date}
            </p>
            
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
                <h3 style="color: #1e3a8a; margin-top: 0;">📝 Rehearsal Notes & Homework</h3>
                <p style="font-size: 16px; color: #1e40af; line-height: 1.5;">${formattedNotes}</p>
            </div>

            <div style="margin-top: 20px;">
                <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">🎬 Scenes Worked</h3>
                ${scenesHtml}
            </div>

            <div style="margin-top: 20px;">
                <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">📋 Attendance Log</h3>
                ${absencesHtml}
            </div>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; text-align: center;">
              This is an automated message from Open Backstage.
            </p>
        </div>
      `
    });

    if (error) {
      console.error("Resend Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send nightly report:", error);
    return { success: false, error: "Internal server error." };
  }
}