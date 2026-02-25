/**
 * voice-registration - Start registration flow for new hosts
 * Looks up caller name via external API and plays "system identified you as [name]"
 * Same identification message as option 1 for registered users
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
    // Get phone number from either formData or query params
    let from = '';
    try {
      const formData = await req.formData();
      from = (formData.get('From') as string) || '';
    } catch {
      const searchParams = new URL(req.url).searchParams;
      from = searchParams.get('from') || '';
    }

    console.log('Registration started for:', from);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';
    const dbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

    // Parallel: look up caller name + fetch recordings (identification + registration welcome)
    const [callerName, recordingsRes] = await Promise.all([
      lookupCallerName(from),
      fetch(
        `${supabaseUrl}/rest/v1/system_recordings?key=in.(system_identified_you,registration_beds_prompt)&select=key,file_url,tts_text,use_tts`,
        { headers: dbHeaders }
      ),
    ]);

    const recordings: Record<string, { file_url?: string; tts_text?: string }> = {};
    try {
      const recordingsData = await recordingsRes.json();
      for (const r of recordingsData || []) {
        recordings[r.key] = { file_url: r.use_tts ? undefined : r.file_url, tts_text: r.tts_text };
      }
    } catch (e) { console.error('Recordings fetch error:', e); }

    console.log('Caller name lookup result:', callerName);

    // Build identification + registration prompt
    let identificationXml = '';
    if (callerName) {
      identificationXml = `
  ${playOrSay(recordings['system_identified_you'] || null, 'The system recognizes you as')}
  <Say voice="man" language="en-US">${callerName}.</Say>`;
    }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>${identificationXml}
  <Gather action="${baseUrl}/voice-reg-beds?from=${encodeURIComponent(from)}" numDigits="2" finishOnKey="#" timeout="15">
    ${playOrSay(recordings['registration_beds_prompt'] || null, 'Welcome to host registration. Please enter the number of beds you can offer, then press pound.')}
  </Gather>
  <Say voice="man" language="en-US">We did not receive your input. Please try again later.</Say>
</Response>`;

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error in voice-registration:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">Sorry, there was an error. Please try again later.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
