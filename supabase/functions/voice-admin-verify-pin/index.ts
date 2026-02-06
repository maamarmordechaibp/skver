/**
 * voice-admin-verify-pin - Verify admin PIN
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const pin = (formData.get('Digits') as string) || '';

    const adminPin = Deno.env.get('ADMIN_PIN') || '1234';

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    console.log(`Admin PIN attempt: "${pin}", valid: ${pin === adminPin}`);

    if (pin === adminPin) {
      const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-admin-save-beds" numDigits="5" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      Code verified. How many beds do we need this Shabbat? Enter the number and press pound.
    </Say>
  </Gather>
</Response>`;

      return new Response(laml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    } else {
      // Wrong PIN - must return 200 for SignalWire to process LaML
      const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Incorrect code. Please try again.</Say>
  <Gather action="${baseUrl}/voice-admin-verify-pin" numDigits="10" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">Enter your access code and press pound.</Say>
  </Gather>
  <Say voice="man" language="en-US">Goodbye.</Say>
</Response>`;

      return new Response(laml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">An error occurred. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
