/**
 * voice-outbound-call - Make outbound call to host asking about availability
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const campaignId = searchParams.get('campaign_id') || '';
    const hostId = searchParams.get('host_id') || '';
    const hostName = searchParams.get('host_name') || 'Guest';
    const totalBeds = parseInt(searchParams.get('total_beds') || '0', 10);
    const messageUrl = searchParams.get('message_url') || '';

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    // XML requires & to be escaped as &amp; in attribute values
    const responseUrl = `${baseUrl}/voice-outbound-response?campaign_id=${campaignId}&amp;host_id=${hostId}&amp;total_beds=${totalBeds}`;

    let playSection = '';
    if (messageUrl) {
      playSection = `
  <Play>${messageUrl}</Play>
  <Pause length="1"></Pause>`;
    }

    // Escape host name for XML (& < > " ')
    const safeHostName = hostName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>${playSection}
  <Gather action="${responseUrl}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">Hello ${safeHostName}. We are reaching out about available guests. You have indicated ${totalBeds} beds available. Press 1 to confirm. Press 2 to change. Press 3 to decline.</Say>
  </Gather>
  <Say voice="man" language="en-US">We did not receive a response. We will try again later. Goodbye.</Say>
</Response>`;

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">An error occurred. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
