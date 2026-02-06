/**
 * voice-voicemail - Voicemail recording prompt
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const from = searchParams.get('from') || '';

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Please leave a message with your name and phone number after the beep. Press pound when done.
  </Say>
  <Record
    action="${baseUrl}/voice-voicemail-complete?from=${encodeURIComponent(from)}"
    maxLength="120"
    finishOnKey="#"
    playBeep="true"
  />
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
