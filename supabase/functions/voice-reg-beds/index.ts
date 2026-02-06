/**
 * voice-reg-beds - Get number of beds during registration
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || '';
    
    const formData = await req.formData();
    const beds = (formData.get('Digits') as string) || '0';

    console.log('Registration beds for', from, ':', beds);

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    // IMPORTANT: Use &amp; instead of & in XML URLs
    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-reg-location?from=${encodeURIComponent(from)}&amp;beds=${beds}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">
      You entered ${beds} beds. Is this a private accommodation or your home? Press 1 for private, press 2 for home.
    </Say>
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
