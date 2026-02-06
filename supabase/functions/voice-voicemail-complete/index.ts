/**
 * voice-voicemail-complete - Save voicemail and notify office
 * Inline version - no shared imports
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';

    const formData = await req.formData();
    const recordingUrl = (formData.get('RecordingUrl') as string) || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const signalwirePhone = Deno.env.get('SIGNALWIRE_PHONE_NUMBER') || '';

    console.log(`Voicemail from ${from}, recording: ${recordingUrl}`);

    // Log voicemail via REST
    fetch(`${supabaseUrl}/rest/v1/call_logs`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        direction: 'inbound',
        from_number: from,
        to_number: signalwirePhone,
        status: 'voicemail',
        recording_url: recordingUrl,
      }),
    }).catch(e => console.error('Log error:', e));

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you for your message. We will contact you soon. Goodbye.
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
