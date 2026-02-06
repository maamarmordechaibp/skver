/**
 * voice-option-1-registered - Handler for registered hosts reporting availability
 * Checks if campaign is full, then asks to confirm or change beds
 * Uses system recordings if available, otherwise TTS
 * OPTIMIZED: All DB queries run in parallel + external API enrichment moved here
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_API_KEY') || '';
const EXTERNAL_API_URL = 'https://wbqcdldbktrchmcareaz.supabase.co/functions/v1/external-api';

// Helper to build Play or Say element
function playOrSay(recording: { file_url?: string; tts_text?: string } | null, fallbackText: string): string {
  if (recording?.file_url) {
    return `<Play>${recording.file_url}</Play>`;
  }
  const text = recording?.tts_text || fallbackText;
  return `<Say voice="man" language="en-US">${text}</Say>`;
}

// Search external API by phone (enrich host data)
async function searchExternalApi(phone: string) {
  if (!EXTERNAL_API_KEY) return null;
  const digits = phone.replace(/\D/g, '');
  const last7 = digits.slice(-7);
  const format = last7.slice(0, 3) + '-' + last7.slice(3);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const res = await fetch(`${EXTERNAL_API_URL}/contacts?q=${encodeURIComponent(format)}`, {
      headers: { 'X-API-Key': EXTERNAL_API_KEY, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.contacts?.length > 0) return data.contacts[0];
  } catch (e) { console.error('External API error:', e); }
  return null;
}

serve(async (req) => {
  try {
    const from = new URL(req.url).searchParams.get('from') || '';
    console.log(`voice-option-1-registered called for ${from}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';
    const dbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

    // === PARALLEL: host + recordings + campaign + external API enrichment ===
    const [hostRes, recordingsRes, campRes, externalContact] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}&select=id,name,total_beds,address_1`,
        { headers: dbHeaders }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/system_recordings?key=in.(system_identified_you,we_have_in_system,confirm_or_change,all_beds_booked)&select=key,file_url,tts_text,use_tts`,
        { headers: dbHeaders }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/campaigns?status=eq.active&select=beds_needed,beds_confirmed`,
        { headers: dbHeaders }
      ),
      searchExternalApi(from),
    ]);

    const [hosts, recordingsData, campaigns] = await Promise.all([
      hostRes.json(),
      recordingsRes.json(),
      campRes.json(),
    ]);

    let host = hosts?.[0];

    if (!host) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">We could not identify your number. Goodbye.</Say>
</Response>`,
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Enrich host from external API if name or address is missing
    if (externalContact && (!host.name || host.name === 'Unknown Guest' || !host.address_1)) {
      const name = [externalContact.first_name || '', externalContact.last_name || ''].filter(Boolean).join(' ').trim();
      const houseNum = externalContact.street_number || '';
      const street = externalContact.street || '';
      const address1 = [houseNum, street].filter(Boolean).join(' ').trim();
      const address2 = externalContact.apartment || '';
      const city = externalContact.city || '';
      const state = externalContact.state || '';
      const zip = externalContact.zip || '';

      if (name) {
        host.name = name;
        // Fire-and-forget: update host in DB
        fetch(`${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}`, {
          method: 'PATCH',
          headers: { ...dbHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, address_1: address1, address_2: address2, city, state, zip }),
        }).catch(e => console.error('Host update error:', e));
        console.log(`Enriched host: ${name}, address: ${address1}`);
      }
    }

    // Parse recordings
    const recordings: Record<string, { file_url?: string; tts_text?: string }> = {};
    for (const r of recordingsData || []) {
      recordings[r.key] = { file_url: r.use_tts ? null : r.file_url, tts_text: r.tts_text };
    }

    // Check if ALL active campaigns are full
    let campaignFull = false;
    const activeCampaigns = Array.isArray(campaigns) ? campaigns : [];
    if (activeCampaigns.length > 0) {
      campaignFull = activeCampaigns.every(
        (c: any) => c.beds_needed > 0 && c.beds_confirmed >= c.beds_needed
      );
    }
    console.log(`Campaign check: ${activeCampaigns.length} active campaigns, allFull=${campaignFull}, details=${JSON.stringify(activeCampaigns.map((c: any) => ({ needed: c.beds_needed, confirmed: c.beds_confirmed })))}`);

    let laml: string;

    if (campaignFull) {
      // Campaign is full - play "all beds booked" message
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${playOrSay(recordings['system_identified_you'], 'The system recognizes you as')}
  <Say voice="man" language="en-US">${host.name || 'a registered host'}.</Say>
  ${playOrSay(recordings['all_beds_booked'], 'All beds are completed for this week. We dont need any beds at this time. Thank you for your willingness to help. Have a good Shabbat.')}
</Response>`;
    } else {
      // Ask to confirm or change beds
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${playOrSay(recordings['system_identified_you'], 'The system recognizes you as')}
  <Say voice="man" language="en-US">${host.name || 'a registered host'}.</Say>
  <Gather action="${baseUrl}/voice-confirm-or-change?from=${encodeURIComponent(from)}" numDigits="1" timeout="10">
    ${playOrSay(recordings['we_have_in_system'], 'We have in the system that you have')}
    <Say voice="man" language="en-US">${host.total_beds || 0}</Say>
    ${playOrSay(recordings['confirm_or_change'], 'beds. To confirm all beds are available for this week, press 1. To change the amount, press 2.')}
  </Gather>
</Response>`;
    }

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error in voice-option-1-registered:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Sorry, there was an error. Please try again later.</Say>
</Response>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});
