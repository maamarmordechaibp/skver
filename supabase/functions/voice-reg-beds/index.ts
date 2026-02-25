/**
 * voice-reg-beds - Get number of beds during registration
 * Uses system recordings for prompts
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

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
    const beds = (formData.get('Digits') as string) || '0';

    console.log('Registration beds for', from, ':', beds);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';
    const dbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

    // Fetch private_or_not recording
    let recording: { file_url?: string; tts_text?: string } | null = null;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/system_recordings?key=eq.private_or_not&select=key,file_url,tts_text,use_tts`,
        { headers: dbHeaders }
      );
      const data = await res.json();
      if (data?.[0]) {
        const r = data[0];
        recording = { file_url: r.use_tts ? undefined : r.file_url, tts_text: r.tts_text };
      }
    } catch (e) { console.error('Recording fetch error:', e); }

    // IMPORTANT: Use &amp; instead of & in XML URLs
    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-reg-location?from=${encodeURIComponent(from)}&amp;beds=${beds}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">You entered ${beds} beds.</Say>
    ${playOrSay(recording, 'Is this a private accommodation or your home? Press 1 for private, press 2 for home.')}
  </Gather>
  <Say voice="man" language="en-US">We did not receive your input.</Say>
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
