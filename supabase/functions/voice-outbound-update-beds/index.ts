/**
 * voice-outbound-update-beds - Update bed count during outbound call
 * Inline version - no shared imports
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('campaign_id') || '';
    const hostId = url.searchParams.get('host_id') || '';

    const formData = await req.formData();
    const beds = parseInt((formData.get('Digits') as string) || '0', 10);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };

    console.log(`Outbound update beds: campaign=${campaignId}, host=${hostId}, beds=${beds}`);

    // Save response
    await fetch(`${supabaseUrl}/rest/v1/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        campaign_id: campaignId,
        host_id: hostId,
        beds_offered: beds,
        response_type: 'accepted',
        response_method: 'outbound_call',
        responded_at: new Date().toISOString(),
      }),
    });

    // Update campaign beds_confirmed
    const campRes = await fetch(
      `${supabaseUrl}/rest/v1/campaigns?id=eq.${campaignId}&select=beds_confirmed`,
      { headers }
    );
    const camps = await campRes.json();
    if (camps?.[0]) {
      await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${campaignId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ beds_confirmed: (camps[0].beds_confirmed || 0) + beds }),
      });
    }

    // Update host total_beds
    await fetch(`${supabaseUrl}/rest/v1/hosts?id=eq.${hostId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ total_beds: beds }),
    });

    // Update queue status
    await fetch(
      `${supabaseUrl}/rest/v1/call_queue?campaign_id=eq.${campaignId}&host_id=eq.${hostId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
      }
    );

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you for confirming. We will contact you shortly to arrange guests. Goodbye.
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

