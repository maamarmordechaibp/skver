/**
 * voice-reg-frequency - Complete registration: save beds, location, frequency
 * Inline version - no shared imports for reliable deployment
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const from = searchParams.get('from') || '';
    const beds = searchParams.get('beds') || '0';
    const location = searchParams.get('location') || 'home';

    const formData = await req.formData();
    const frequency = (formData.get('Digits') as string) === '1' ? 'weekly' : 'special';

    console.log('Registration complete for', from, 'beds:', beds, 'location:', location, 'frequency:', frequency);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Update host with registration info using direct REST call
    if (from) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            total_beds: parseInt(beds, 10),
            location_type: location,
            call_frequency: frequency,
            is_registered: true,
            is_private: location === 'private',
          }),
        }
      );
      const resText = await res.text();
      console.log('Host update status:', res.status, 'body:', resText);
    }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you for registering with ${beds} beds! You have selected ${frequency === 'weekly' ? 'weekly' : 'special occasion'} calls. You will now receive calls when guests need accommodation. Have a wonderful day!
  </Say>
</Response>`;

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">Sorry, there was an error completing your registration. Please try again later.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
