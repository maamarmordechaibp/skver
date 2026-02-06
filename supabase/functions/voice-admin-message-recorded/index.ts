/**
 * voice-admin-message-recorded - Play back recorded message
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const beds = searchParams.get('beds') || '0';

    const formData = await req.formData();
    const recordingUrl = (formData.get('RecordingUrl') as string) || '';

    const baseUrl = Deno.env.get('SUPABASE_URL')
      ? new URL(Deno.env.get('SUPABASE_URL') || '').origin + '/functions/v1'
      : '';

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Your message:</Say>
  ${recordingUrl ? `<Play>${recordingUrl}</Play>` : ''}
  <Gather action="${baseUrl}/voice-admin-message-action?beds=${beds}&amp;recording=${encodeURIComponent(recordingUrl)}" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">
      Press 1 to hear again.
      Press 2 to re-record.
      Press 3 to confirm.
    </Say>
  </Gather>
</Response>`;

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
