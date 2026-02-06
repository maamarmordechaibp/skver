/**
 * voice-admin-launch-campaign - Launch campaign and start calling hosts
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const beds = searchParams.get('beds') || '0';
    const recording = searchParams.get('recording') || '';

    const formData = await req.formData();
    const digits = (formData.get('Digits') as string) || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const apiUrl = supabaseUrl.replace(/\/$/, '');
    const baseUrl = apiUrl + '/functions/v1';
    const dbHeaders = {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceRoleKey,
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
    };

    if (digits === '1') {
      // Get next Saturday
      const today = new Date();
      let nextShabbat = new Date(today);
      const day = nextShabbat.getDay();
      const daysUntilSaturday = day === 6 ? 7 : (6 - day + 7) % 7;
      nextShabbat.setDate(nextShabbat.getDate() + daysUntilSaturday);

      // Create campaign via REST API
      const campaignResponse = await fetch(`${apiUrl}/rest/v1/campaigns`, {
        method: 'POST',
        headers: { ...dbHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          shabbat_date: nextShabbat.toISOString().split('T')[0],
          beds_needed: parseInt(beds, 10),
          beds_confirmed: 0,
          custom_message_url: recording,
          status: 'active',
        }),
      });

      const campaignData = await campaignResponse.json();
      const campaignId = campaignData?.[0]?.id;
      console.log(`Campaign created: ${campaignResponse.status}, id=${campaignId}`);

      if (campaignResponse.ok && campaignId) {
        // Queue registered hosts and launch calls
        const hostsRes = await fetch(
          `${apiUrl}/rest/v1/hosts?is_registered=eq.true&total_beds=gt.0&select=id,name,phone_number,total_beds`,
          { headers: dbHeaders }
        );
        const hosts = await hostsRes.json();
        console.log(`Found ${Array.isArray(hosts) ? hosts.length : 0} registered hosts`);

        if (Array.isArray(hosts) && hosts.length > 0) {
          // Insert queue items
          const queueItems = hosts.map((h: any) => ({
            campaign_id: campaignId,
            host_id: h.id,
            status: 'pending',
          }));
          const queueRes = await fetch(`${apiUrl}/rest/v1/call_queue`, {
            method: 'POST',
            headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify(queueItems),
          });
          console.log(`Queue insert: ${queueRes.status}`);

          // Launch calls
          const launchRes = await fetch(`${baseUrl}/voice-launch-calls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceRoleKey}` },
            body: JSON.stringify({ campaignId, batchSize: 5 }),
          });
          const launchData = await launchRes.json();
          console.log(`Launch result:`, JSON.stringify(launchData));
        }

        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you. The campaign has been created and calls are being launched. Goodbye.
  </Say>
</Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      } else {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">There was an error creating the campaign. Please try again. Goodbye.</Say>
</Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
      }
    } else if (digits === '2') {
      // Change beds
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-admin-save-beds" numDigits="5" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      How many beds do we need? Enter the number and press pound.
    </Say>
  </Gather>
</Response>`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">Invalid option. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">An error occurred. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
