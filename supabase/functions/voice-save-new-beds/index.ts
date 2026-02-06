/**
 * voice-save-new-beds - Save beds for unregistered caller
 * Also records a response to the active campaign if one exists
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';

    const formData = await req.formData();
    const beds = (formData.get('Digits') as string) || '0';
    const bedsNum = parseInt(beds, 10);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const dbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    console.log(`Saving ${bedsNum} beds for ${from}`);

    // Update host via REST + get host id back
    let hostId: string | null = null;
    if (from) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}`,
        {
          method: 'PATCH',
          headers: { ...dbHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify({ total_beds: bedsNum, is_registered: true }),
        }
      );
      const updated = await res.json();
      hostId = updated?.[0]?.id || null;
      console.log('Host update status:', res.status, 'hostId:', hostId);
    }

    // Record response to active campaign if exists
    if (hostId && bedsNum > 0) {
      try {
        const campRes = await fetch(
          `${supabaseUrl}/rest/v1/campaigns?status=eq.active&order=created_at.desc&limit=1&select=id,beds_confirmed`,
          { headers: dbHeaders }
        );
        const campaigns = await campRes.json();
        const campaign = campaigns?.[0];
        if (campaign) {
          // Save response
          await fetch(`${supabaseUrl}/rest/v1/responses`, {
            method: 'POST',
            headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              campaign_id: campaign.id,
              host_id: hostId,
              beds_offered: bedsNum,
              response_type: 'accepted',
              response_method: 'inbound_call',
            }),
          });
          // Update beds_confirmed
          await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${campaign.id}`, {
            method: 'PATCH',
            headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ beds_confirmed: (campaign.beds_confirmed || 0) + bedsNum }),
          });
          console.log(`Recorded ${bedsNum} beds for campaign ${campaign.id}`);
        }
      } catch (e) { console.error('Campaign response error:', e); }
    }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you! You have registered ${bedsNum} beds. We will contact you when guests need accommodation. Have a wonderful Shabbat!
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
