/**
 * voice-admin-save-beds - Save number of beds needed for campaign
 * Removes broken _shared import, uses inline XML
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const beds = (formData.get('Digits') as string) || '0';

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    You entered ${beds} beds. Please record the custom message for hosts after the beep. Press pound when done.
  </Say>
  <Record
    action="${baseUrl}/voice-admin-message-recorded?beds=${beds}"
    maxLength="60"
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
