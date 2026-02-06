/**
 * voice-reg-location - Get accommodation type (private vs home)
 * Inline version - no shared imports
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const from = searchParams.get('from') || '';
    const beds = searchParams.get('beds') || '0';

    const formData = await req.formData();
    const locationType = (formData.get('Digits') as string) === '1' ? 'private' : 'home';

    console.log('Registration location for', from, ':', locationType);

    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    const functionUrl = `${baseUrl}/functions/v1`;

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${functionUrl}/voice-reg-frequency?from=${encodeURIComponent(from)}&amp;beds=${beds}&amp;location=${locationType}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">${locationType === 'private' ? 'Private accommodation' : 'Home accommodation'} selected. How often would you like to receive calls? Press 1 for weekly, press 2 for special occasions only.</Say>
  </Gather>
  <Say voice="man" language="en-US">We did not receive your input.</Say>
</Response>`;

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">An error occurred. Please try again.</Say></Response>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});
