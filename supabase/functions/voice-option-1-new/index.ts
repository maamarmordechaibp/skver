/**
 * voice-option-1-new - Handler for unregistered callers
 * Looks up caller name via external API, plays "system identified you as [name]"
 * Checks campaign capacity, then asks for beds or says all full
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_API_KEY') || '';
const EXTERNAL_API_URL = 'https://wbqcdldbktrchmcareaz.supabase.co/functions/v1/external-api';

async function lookupCallerName(phone: string): Promise<string | null> {
  if (!EXTERNAL_API_KEY) return null;
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const last7 = digits.slice(-7);
  const formats = [
    last7.slice(0, 3) + '-' + last7.slice(3),
    `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`,
    last10,
    phone,
  ];
  for (const format of formats) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${EXTERNAL_API_URL}/contacts?q=${encodeURIComponent(format)}`, {
        headers: { 'X-API-Key': EXTERNAL_API_KEY, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.success && data.contacts?.length > 0) {
        const c = data.contacts[0];
        const name = [c.first_name || '', c.last_name || ''].filter(Boolean).join(' ').trim();
        if (name) return name;
      }
    } catch (e) { console.error('External API error:', e); }
  }
  return null;
}

function playOrSay(recording: { file_url?: string; tts_text?: string } | null, fallbackText: string): string {
  if (recording?.file_url) {
    return `<Play>${recording.file_url}</Play>`;
  }
  const text = recording?.tts_text || fallbackText;
  return `<Say voice="man" language="en-US">${text}</Say>`;
}

serve(async (req) => {
  try {
    const searchParams = new URL(req.url).searchParams;
    const from = searchParams.get('from') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';
    const dbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

    // Parallel: check campaigns + look up caller name + fetch "system_identified_you" recording
    const [campRes, callerName, recordingsRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/campaigns?status=eq.active&select=beds_needed,beds_confirmed`,
        { headers: dbHeaders }
      ),
      lookupCallerName(from),
      fetch(
        `${supabaseUrl}/rest/v1/system_recordings?key=eq.system_identified_you&select=key,file_url,tts_text,use_tts`,
        { headers: dbHeaders }
      ),
    ]);
    const campaigns = await campRes.json();

    let recording: { file_url?: string; tts_text?: string } | null = null;
    try {
      const recordingsData = await recordingsRes.json();
      if (recordingsData?.[0]) {
        const r = recordingsData[0];
        recording = { file_url: r.use_tts ? undefined : r.file_url, tts_text: r.tts_text };
      }
    } catch (e) { console.error('Recordings fetch error:', e); }

    console.log(`voice-option-1-new: caller=${from}, name=${callerName}`);

    const activeCampaigns = Array.isArray(campaigns) ? campaigns : [];
    const allFull = activeCampaigns.length > 0 && activeCampaigns.every(
      (c: any) => c.beds_needed > 0 && c.beds_confirmed >= c.beds_needed
    );

    console.log(`voice-option-1-new: ${activeCampaigns.length} active campaigns, allFull=${allFull}`);

    // Build identification XML — same as option 1 registered
    let identificationXml = '';
    if (callerName) {
      identificationXml = `
  ${playOrSay(recording, 'The system recognizes you as')}
  <Say voice="man" language="en-US">${callerName}.</Say>`;
    }

    let laml: string;

    if (allFull) {
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>${identificationXml}
  <Say voice="man" language="en-US">All beds are completed for this week. We don't need any beds at this time. Thank you for your willingness to help. Have a good Shabbat.</Say>
</Response>`;
    } else {
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>${identificationXml}
  <Gather action="${baseUrl}/voice-save-new-beds?from=${encodeURIComponent(from)}" numDigits="2" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      We have your number but you are not yet registered. Please enter the number of beds available, then press pound.
    </Say>
  </Gather>
</Response>`;
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
