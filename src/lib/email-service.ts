/**
 * Email Service
 * Sends campaign reports and notifications
 */

interface EmailRecipient {
  email: string;
}

interface CampaignReport {
  campaignId: string;
  shabbatDate: string;
  bedsNeeded: number;
  bedsConfirmed: number;
  acceptedCount: number;
  declinedCount: number;
  acceptedHosts: Array<{
    name: string;
    phone: string;
    beds: number;
  }>;
  declinedHosts: Array<{
    name: string;
    phone: string;
  }>;
}

export async function sendCampaignReport(
  report: CampaignReport,
  recipientEmail: string
): Promise<void> {
  try {
    const html = buildCampaignReportHtml(report);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'reports@machniseiorchim.org',
        to: recipientEmail,
        subject: `Campaign Report - Shabbat ${report.shabbatDate}`,
        html,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

export async function sendVoicemailNotification(
  phoneNumber: string,
  recordingUrl: string,
  adminEmail: string
): Promise<void> {
  try {
    const html = buildVoicemailNotificationHtml(phoneNumber, recordingUrl);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'alerts@machniseiorchim.org',
        to: adminEmail,
        subject: `Voicemail from ${phoneNumber}`,
        html,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send voicemail notification: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Voicemail notification error:', error);
    throw error;
  }
}

export async function sendHostConfirmation(
  hostName: string,
  hostEmail: string,
  shabbatDate: string
): Promise<void> {
  try {
    const html = buildHostConfirmationHtml(hostName, shabbatDate);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'confirmations@machniseiorchim.org',
        to: hostEmail,
        subject: `Registration Confirmation`,
        html,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send confirmation: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Confirmation email error:', error);
    throw error;
  }
}

function buildCampaignReportHtml(report: CampaignReport): string {
  const progressPercent = report.bedsNeeded > 0 
    ? Math.round((report.bedsConfirmed / report.bedsNeeded) * 100)
    : 0;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          h1 { color: #2c5aa0; margin-bottom: 20px; }
          h2 { color: #2c5aa0; margin-top: 30px; margin-bottom: 15px; }
          .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .metric { margin-bottom: 10px; }
          .metric-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #2c5aa0; color: white; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:hover { background: #f9f9f9; }
          .progress-bar { width: 100%; height: 30px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin: 10px 0; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); width: ${progressPercent}%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Campaign Report</h1>
        <p>Shabbat Date: <strong>${report.shabbatDate}</strong></p>
        
        <div class="summary">
          <h2>Summary</h2>
          <div class="metric">
            <span class="metric-label">Beds Needed:</span> ${report.bedsNeeded}
          </div>
          <div class="metric">
            <span class="metric-label">Beds Confirmed:</span> ${report.bedsConfirmed}
          </div>
          <div class="metric">
            <span class="metric-label">Progress:</span>
            <div class="progress-bar">
              <div class="progress-fill">${progressPercent}%</div>
            </div>
          </div>
          <div class="metric">
            <span class="metric-label">Acceptance Rate:</span> ${report.acceptedCount} accepted, ${report.declinedCount} declined
          </div>
        </div>
        
        ${report.acceptedHosts.length > 0 ? `
          <h2>Acceptances (${report.acceptedHosts.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Host Name</th>
                <th>Phone</th>
                <th>Beds Offered</th>
              </tr>
            </thead>
            <tbody>
              ${report.acceptedHosts.map(host => `
                <tr>
                  <td>${host.name || 'Unknown'}</td>
                  <td>${host.phone}</td>
                  <td>${host.beds}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${report.declinedHosts.length > 0 ? `
          <h2>Declines (${report.declinedHosts.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Host Name</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              ${report.declinedHosts.map(host => `
                <tr>
                  <td>${host.name || 'Unknown'}</td>
                  <td>${host.phone}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        <div class="footer">
          <p>This is an automated report from the Machnisei Orchim system.</p>
        </div>
      </body>
    </html>
  `;
}

function buildVoicemailNotificationHtml(phoneNumber: string, recordingUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          h1 { color: #2c5aa0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
          .footer { margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>New Voicemail</h1>
        <div class="content">
          <p><strong>From:</strong> ${phoneNumber}</p>
          <p><strong>Recording:</strong></p>
          <audio controls style="width: 100%; margin: 10px 0;">
            <source src="${recordingUrl}" type="audio/wav">
            Your browser does not support the audio element.
          </audio>
          <p><a href="${recordingUrl}" download>Download Recording</a></p>
        </div>
        <div class="footer">
          <p>Please follow up with this caller at your earliest convenience.</p>
        </div>
      </body>
    </html>
  `;
}

function buildHostConfirmationHtml(hostName: string, shabbatDate: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          h1 { color: #2c5aa0; }
          .message { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Registration Confirmed</h1>
        <div class="message">
          <p>Dear ${hostName},</p>
          <p>Thank you for registering with the Machnisei Orchim system!</p>
          <p>When your availability is confirmed and we arrange guests for Shabbat ${shabbatDate}, 
          we may contact you to confirm the arrangement at your convenience.</p>
          <p>May you have a blessed Shabbat!</p>
        </div>
        <div class="footer">
          <p>Machnisei Orchim - Guest House Coordination</p>
        </div>
      </body>
    </html>
  `;
}
