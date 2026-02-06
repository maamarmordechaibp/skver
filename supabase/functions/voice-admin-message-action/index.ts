/**
 * voice-admin-message-action - Handle playback/re-record/confirm actions
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const beds = searchParams.get('beds') || '0';
    const recording = searchParams.get('recording') || '';

    const formData = await req.formData();
    const digits = (formData.get('Digits') as string) || '';

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    let laml = '';

    if (digits === '1') {
      // Play again
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Your message:</Say>
  ${recording ? `<Play>${recording}</Play>` : ''}
  <Gather action="${baseUrl}/voice-admin-message-action?beds=${beds}&amp;recording=${encodeURIComponent(recording)}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">
      Press 1 to hear again.
      Press 2 to re-record.
      Press 3 to confirm.
    </Say>
  </Gather>
</Response>`;
    } else if (digits === '2') {
      // Re-record
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Please record the message again after the beep. Press pound when done.
  </Say>
  <Record
    action="${baseUrl}/voice-admin-message-recorded?beds=${beds}"
    maxLength="60"
    finishOnKey="#"
    playBeep="true"
  />
</Response>`;
    } else if (digits === '3') {
      // Confirm campaign
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-admin-launch-campaign?beds=${beds}&amp;recording=${encodeURIComponent(recording)}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">
      You requested ${beds} beds. Press 1 to launch the campaign. Press 2 to change the number.
    </Say>
  </Gather>
</Response>`;
    } else {
      laml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">Invalid option. Goodbye.</Say></Response>`;
    }

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">An error occurred. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
