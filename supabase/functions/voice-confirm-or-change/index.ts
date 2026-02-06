/**
 * voice-confirm-or-change - Confirm availability or change number of beds
 * Press 1 = Confirm beds, save response
 * Press 2 = Enter new bed count
 * Uses system recordings if available
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// Helper to build Play or Say element
function playOrSay(recording: { file_url?: string; tts_text?: string } | null, fallbackText: string): string {
  if (recording?.file_url) {
    return `<Play>${recording.file_url}</Play>`;
  }
  const text = recording?.tts_text || fallbackText;
  return `<Say voice="man" language="en-US">${text}</Say>`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';
    const formData = await req.formData();
    const digits = (formData.get('Digits') as string) || '';

    console.log(`voice-confirm-or-change: digits=${digits}, from=${from}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';

    // Fetch system recordings
    const recordingsRes = await fetch(
      `${supabaseUrl}/rest/v1/system_recordings?key=in.(thank_you_friday,enter_amount_beds)&select=key,file_url,tts_text,use_tts`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const recordingsData = await recordingsRes.json();
    const recordings: Record<string, { file_url?: string; tts_text?: string }> = {};
    for (const r of recordingsData || []) {
      recordings[r.key] = { file_url: r.use_tts ? null : r.file_url, tts_text: r.tts_text };
    }

    if (digits === '1') {
      // Confirm beds - record response
      const hostRes = await fetch(
        `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}&select=id,total_beds`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const hosts = await hostRes.json();
      const host = hosts?.[0];

      // Get active campaign
      const campRes = await fetch(
        `${supabaseUrl}/rest/v1/campaigns?status=eq.active&order=created_at.desc&limit=1`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const campaigns = await campRes.json();
      const campaignId = campaigns?.[0]?.id || null;

      // Record response
      if (host?.id) {
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
              beds_offered: host.total_beds || 0,
              response_type: 'accepted',
              response_method: 'inbound_call'
            })
          }
        );

        // Update campaign beds_confirmed
        if (campaignId && campaigns?.[0]) {
          const newConfirmed = (campaigns[0].beds_confirmed || 0) + (host.total_beds || 0);
          await fetch(
            `${supabaseUrl}/rest/v1/campaigns?id=eq.${campaignId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ beds_confirmed: newConfirmed })
            }
          );
        }
      }

      // Play thank you message
      const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${playOrSay(recordings['thank_you_friday'], `Thank you for confirming your ${host?.total_beds || 0} beds. We will get back to you on Friday. Have a good Shabbat.`)}
</Response>`;

      return new Response(laml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    } else if (digits === '2') {
      // Change beds - ask for new amount
      const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-update-beds?from=${encodeURIComponent(from)}" numDigits="2" finishOnKey="#" timeout="15">
    ${playOrSay(recordings['enter_amount_beds'], 'How many beds do you have available for this week? Enter the number and press pound.')}
  </Gather>
</Response>`;

      return new Response(laml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Invalid option. Goodbye.</Say>
</Response>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error in voice-confirm-or-change:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Sorry, there was an error. Please try again later.</Say>
</Response>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});
