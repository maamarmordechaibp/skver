/**
 * voice-registration - Start registration flow for new hosts
 * Asks for number of beds
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

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

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-reg-beds?from=${encodeURIComponent(from)}" numDigits="2" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      Welcome to host registration. Please enter the number of beds you can offer, then press pound.
    </Say>
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
