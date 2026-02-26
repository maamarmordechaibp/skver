/**
 * voice-voicemail-complete - Save voicemail and notify office
 * Inline version - no shared imports
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';

    const formData = await req.formData();
    const recordingUrl = (formData.get('RecordingUrl') as string) || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const signalwirePhone = Deno.env.get('SIGNALWIRE_PHONE_NUMBER') || '';

    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';

    console.log(`Voicemail from ${from}, recording: ${recordingUrl}`);

    // Log voicemail via REST
    fetch(`${supabaseUrl}/rest/v1/call_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        direction: 'inbound',
        from_number: from,
        to_number: signalwirePhone,
        status: 'voicemail',
        recording_url: recordingUrl,
      }),
    }).catch(e => console.error('Log error:', e));

    // Send voicemail email notification
    if (resendApiKey && adminEmail) {
      const logoUrl = 'https://skver.pages.dev/logo.jpg';
      const emailHtml = `<!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;color:#333}
        h1{color:#2c5aa0}
        .content{background:#f9f9f9;padding:20px;border-radius:8px}
        .footer{margin-top:20px;color:#666;font-size:12px}
      </style></head><body>
        <div style="text-align:center;margin-bottom:20px">
          <img src="${logoUrl}" alt="Logo" style="width:60px;height:60px;border-radius:50%;object-fit:cover" />
        </div>
        <h1>New Voicemail</h1>
        <div class="content">
          <p><strong>From:</strong> ${from}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
          <p><strong>Recording:</strong></p>
          ${recordingUrl ? `<p><a href="${recordingUrl}">Listen to Recording</a></p>` : '<p>No recording URL available</p>'}
        </div>
        <div class="footer"><p>Please follow up with this caller.</p></div>
      </body></html>`;

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'voicemail@machniseiorchim.org',
          to: adminEmail,
          subject: `Voicemail from ${from}`,
          html: emailHtml,
        }),
      }).then(r => console.log(`Voicemail email sent: ${r.status}`))
        .catch(e => console.error('Voicemail email error:', e));
    } else {
      console.log('RESEND_API_KEY or ADMIN_EMAIL not set, skipping voicemail email');
    }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you for your message. We will contact you soon. Goodbye.
  </Say>
</Response>`;

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">Sorry, there was an error. Please try again later.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
