// lib/email.ts
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCompletionEmail(campaignId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get campaign data
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      responses:responses(
        beds_offered,
        response_type,
        host:hosts(name, phone_number)
      )
    `
    )
    .eq("id", campaignId)
    .single();

  if (!campaign) return;

  const acceptances = campaign.responses.filter(
    (r: any) => r.response_type === "accepted"
  );
  const declines = campaign.responses.filter(
    (r: any) => r.response_type === "declined"
  );

  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h1>Campaign Report - Shabbat ${campaign.shabbat_date}</h1>
      
      <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h2>Summary</h2>
        <p><strong>Beds Needed:</strong> ${campaign.beds_needed}</p>
        <p><strong>Beds Confirmed:</strong> ${campaign.beds_confirmed}</p>
        <p><strong>Status:</strong> ${campaign.status}</p>
      </div>
      
      <h2>Acceptances (${acceptances.length})</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #4CAF50; color: white;">
            <th style="padding: 10px; text-align: left;">Host Name</th>
            <th style="padding: 10px; text-align: left;">Phone</th>
            <th style="padding: 10px; text-align: right;">Beds</th>
          </tr>
        </thead>
        <tbody>
          ${acceptances
            .map(
              (a: any) => `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px;">${a.host?.name || "Unknown"}</td>
              <td style="padding: 10px;">${a.host?.phone_number}</td>
              <td style="padding: 10px; text-align: right;">${a.beds_offered}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2 style="margin-top: 40px;">Declines (${declines.length})</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f44336; color: white;">
            <th style="padding: 10px; text-align: left;">Host Name</th>
            <th style="padding: 10px; text-align: left;">Phone</th>
          </tr>
        </thead>
        <tbody>
          ${declines
            .map(
              (d: any) => `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px;">${d.host?.name || "Unknown"}</td>
              <td style="padding: 10px;">${d.host?.phone_number}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "reports@machniseiorchim.org",
      to: process.env.ADMIN_EMAIL!,
      subject: `Campaign Complete - Shabbat ${campaign.shabbat_date}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send completion email:", error);
  }
}

export async function sendVoicemail(
  campaignId: string | null,
  fromNumber: string,
  recordingUrl: string,
  voicemail: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h1>New Voicemail from Guest House Calls</h1>
      
      <p><strong>From:</strong> ${fromNumber}</p>
      <p><strong>Message:</strong></p>
      <p>${voicemail}</p>
      
      ${recordingUrl ? `<p><a href="${recordingUrl}">Listen to Recording</a></p>` : ""}
    </div>
  `;

  try {
    await resend.emails.send({
      from: "voicemail@machniseiorchim.org",
      to: process.env.ADMIN_EMAIL!,
      subject: `Voicemail from ${fromNumber}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send voicemail email:", error);
  }
}
