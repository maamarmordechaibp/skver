/**
 * voice-outbound-response - Handle host response to campaign call
 * Press 1 = Confirm beds available
 * Press 2 = Change number of beds
 * Press 3 = Callback on Friday if still needed
 * Inline version - no shared imports
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

async function saveResponse(supabaseUrl: string, supabaseKey: string, campaignId: string, hostId: string, bedsOffered: number, responseType: string) {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
  // Insert response
  await fetch(`${supabaseUrl}/rest/v1/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      campaign_id: campaignId,
      host_id: hostId,
      beds_offered: bedsOffered,
      response_type: responseType,
      response_method: 'outbound_call',
      responded_at: new Date().toISOString(),
    }),
  });
  // Update campaign beds_confirmed if accepted
  if (responseType === 'accepted') {
    // Get current campaign
    const campRes = await fetch(
      `${supabaseUrl}/rest/v1/campaigns?id=eq.${campaignId}&select=beds_confirmed`,
      { headers }
    );
    const camps = await campRes.json();
    if (camps?.[0]) {
      await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${campaignId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ beds_confirmed: (camps[0].beds_confirmed || 0) + bedsOffered }),
      });
    }
  }
  // Update queue status
  await fetch(
    `${supabaseUrl}/rest/v1/call_queue?campaign_id=eq.${campaignId}&host_id=eq.${hostId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
    }
  );
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('campaign_id') || '';
    const hostId = url.searchParams.get('host_id') || '';
    const beds = parseInt(url.searchParams.get('beds') || url.searchParams.get('total_beds') || '0', 10);

    const formData = await req.formData();
    const digits = (formData.get('Digits') as string) || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';

    console.log(`Outbound response: digit=${digits}, campaign=${campaignId}, host=${hostId}, beds=${beds}`);

    let laml = '';

    if (digits === '1') {
      await saveResponse(supabaseUrl, supabaseKey, campaignId, hostId, beds, 'accepted');
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you for confirming your ${beds} beds. We will get back to you on Friday. Have a good Shabbat.
  </Say>
</Response>`;
    } else if (digits === '2') {
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-outbound-update-beds?campaign_id=${campaignId}&amp;host_id=${hostId}" numDigits="2" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      How many beds do you have available for this week? Enter the number and press pound.
    </Say>
  </Gather>
</Response>`;
    } else if (digits === '3') {
      await saveResponse(supabaseUrl, supabaseKey, campaignId, hostId, beds, 'callback');
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    No problem. We will call you back on Friday if beds are still needed. Have a good day.
  </Say>
</Response>`;
    } else {
      laml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">Invalid option. Goodbye.</Say></Response>`;
    }

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
