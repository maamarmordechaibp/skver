/**
 * voice-update-beds - Update bed count for registered caller
 * Records response and thanks caller
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';

    const formData = await req.formData();
    const beds = (formData.get('Digits') as string) || '0';
    const bedCount = parseInt(beds, 10);

    console.log(`Updating beds for ${from} to ${bedCount}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Get host
    const hostRes = await fetch(
      `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}&select=id,total_beds`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const hosts = await hostRes.json();
    const host = hosts?.[0];

    if (host) {
      // Update host with new beds
      await fetch(
        `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ total_beds: bedCount, updated_at: new Date().toISOString() })
        }
      );

      // Get active campaign
      const campRes = await fetch(
        `${supabaseUrl}/rest/v1/campaigns?status=eq.active&order=created_at.desc&limit=1`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const campaigns = await campRes.json();
      const campaignId = campaigns?.[0]?.id || null;

      // Record response
      await fetch(
        `${supabaseUrl}/rest/v1/responses`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            host_id: host.id,
            beds_offered: bedCount,
            response_type: 'accepted',
            response_method: 'inbound_call',
            notes: `Updated from ${host.total_beds || 0} to ${bedCount} beds`
          })
        }
      );
    }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you. We have updated your beds to ${bedCount}. We will get back to you on Friday. Have a good Shabbat.
  </Say>
</Response>`;

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error in voice-update-beds:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Sorry, there was an error. Please try again later.</Say>
</Response>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});
