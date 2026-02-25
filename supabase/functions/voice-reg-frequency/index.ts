/**
 * voice-reg-frequency - Complete registration: save beds, location, frequency
 * Also enriches host with name/address from external API
 * Inline version - no shared imports for reliable deployment
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_API_KEY') || '';

function playOrSay(recording: { file_url?: string; tts_text?: string } | null, fallbackText: string): string {
  if (recording?.file_url) {
    return `<Play>${recording.file_url}</Play>`;
  }
  const text = recording?.tts_text || fallbackText;
  return `<Say voice="man" language="en-US">${text}</Say>`;
}
const EXTERNAL_API_URL = 'https://wbqcdldbktrchmcareaz.supabase.co/functions/v1/external-api';

async function lookupContact(phone: string): Promise<any> {
  if (!EXTERNAL_API_KEY) return null;
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const last7 = digits.slice(-7);
  const formats = [
    last7.slice(0, 3) + '-' + last7.slice(3),
    `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`,
    last10,
    phone,
  ];
  for (const format of formats) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${EXTERNAL_API_URL}/contacts?q=${encodeURIComponent(format)}`, {
        headers: { 'X-API-Key': EXTERNAL_API_KEY, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.success && data.contacts?.length > 0) return data.contacts[0];
    } catch (e) { console.error('External API error:', e); }
  }
  return null;
}

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
      // Look up contact from external API for name/address enrichment
      const contact = await lookupContact(from);
      const enrichData: Record<string, any> = {
        total_beds: parseInt(beds, 10),
        location_type: location,
        call_frequency: frequency,
        is_registered: true,
        is_private: location === 'private',
      };

      if (contact) {
        const name = [contact.first_name || '', contact.last_name || ''].filter(Boolean).join(' ').trim();
        if (name) enrichData.name = name;
        const address1 = [contact.street_number || '', contact.street || ''].filter(Boolean).join(' ').trim();
        if (address1) enrichData.address_1 = address1;
        if (contact.apartment) enrichData.address_2 = contact.apartment;
        if (contact.city) enrichData.city = contact.city;
        if (contact.state) enrichData.state = contact.state;
        if (contact.zip) enrichData.zip = contact.zip;
        console.log('Enriching host with external data:', JSON.stringify(enrichData));
      }

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
          body: JSON.stringify(enrichData),
        }
      );
      const resText = await res.text();
      console.log('Host update status:', res.status, 'body:', resText);
    }

    // Fetch registration_thank_you recording
    let thankYouRecording: { file_url?: string; tts_text?: string } | null = null;
    try {
      const recRes = await fetch(
        `${supabaseUrl}/rest/v1/system_recordings?key=eq.registration_thank_you&select=key,file_url,tts_text,use_tts`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const recData = await recRes.json();
      if (recData?.[0]) {
        const r = recData[0];
        thankYouRecording = { file_url: r.use_tts ? undefined : r.file_url, tts_text: r.tts_text };
      }
    } catch (e) { console.error('Recording fetch error:', e); }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${playOrSay(thankYouRecording, `Thank you for registering with ${beds} beds! You have selected ${frequency === 'weekly' ? 'weekly' : 'special occasion'} calls. You will now receive calls when guests need accommodation. Have a wonderful day!`)}
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
