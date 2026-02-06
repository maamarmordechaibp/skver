/**
 * voice-incoming - Handle incoming phone calls
 * OPTIMIZED: Fast DB queries → immediate LaML response → background external API enrichment
 * External API runs AFTER response is sent (fire-and-forget) to avoid SignalWire timeout
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_API_KEY') || '';
const EXTERNAL_API_URL = 'https://wbqcdldbktrchmcareaz.supabase.co/functions/v1/external-api';

const DB_HEADERS: Record<string, string> = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// Search external API by phone number (tries multiple formats, generous timeout)
async function searchExternalApi(phone: string): Promise<any> {
  if (!EXTERNAL_API_KEY) { console.log('No EXTERNAL_API_KEY set'); return null; }
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const last7 = digits.slice(-7);

  // Try multiple phone formats
  const formats = [
    last7.slice(0, 3) + '-' + last7.slice(3),                                    // 376-2437
    `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`,          // (845) 376-2437
    last10,                                                                        // 8453762437
    phone,                                                                         // +18453762437
  ];

  for (const format of formats) {
    try {
      console.log(`External API searching: ${format}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout (background, no rush)
      const res = await fetch(`${EXTERNAL_API_URL}/contacts?q=${encodeURIComponent(format)}`, {
        headers: { 'X-API-Key': EXTERNAL_API_KEY, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) { console.log(`External API ${res.status} for ${format}`); continue; }
      const data = await res.json();
      console.log(`External API result for ${format}: ${data.contacts?.length || 0} contacts`);
      if (data.success && data.contacts?.length > 0) {
        console.log(`External API found: ${JSON.stringify(data.contacts[0])}`);
        return data.contacts[0];
      }
    } catch (e) { console.error(`External API error for ${format}:`, e); }
  }
  return null;
}

// Extract host data from external API contact
// API fields: first_name, last_name, street_number, street, apartment, city, state, zip, mobile, home_phone, title
function extractContactData(contact: any) {
  const name = [
    contact.first_name || '',
    contact.last_name || '',
  ].filter(Boolean).join(' ').trim();

  // Build address_1 from street_number + street (e.g. "5 Ridge Ave.")
  const houseNum = contact.street_number || '';
  const street = contact.street || '';
  const address1 = [houseNum, street].filter(Boolean).join(' ').trim();

  return {
    name: name || null,
    address_1: address1,
    address_2: contact.apartment || '',
    city: contact.city || '',
    state: contact.state || '',
    zip: contact.zip || '',
  };
}

// Background: look up external API and enrich host record
async function enrichHostFromExternalApi(phone: string): Promise<void> {
  try {
    const contact = await searchExternalApi(phone);
    if (!contact) { console.log('No external contact found for enrichment'); return; }
    
    const data = extractContactData(contact);
    if (!data.name) { console.log('External contact has no name'); return; }

    const updateData: Record<string, any> = { name: data.name };
    if (data.address_1) updateData.address_1 = data.address_1;
    if (data.address_2) updateData.address_2 = data.address_2;
    if (data.city) updateData.city = data.city;
    if (data.state) updateData.state = data.state;
    if (data.zip) updateData.zip = data.zip;

    console.log(`Enriching host ${phone} with:`, JSON.stringify(updateData));
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(phone)}`,
      {
        method: 'PATCH',
        headers: { ...DB_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(updateData),
      }
    );
    const resText = await res.text();
    console.log(`Host enrich PATCH status: ${res.status}, body: ${resText}`);
  } catch (e) {
    console.error('enrichHostFromExternalApi error:', e);
  }
}

// Generate main menu LaML
function mainMenuLaml(baseUrl: string, recordingUrl?: string, ttsText?: string): string {
  const voice = 'man';
  const functionUrl = `${baseUrl}/functions/v1`;

  if (recordingUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${functionUrl}/voice-main-menu" numDigits="1" timeout="10">
    <Play>${recordingUrl}</Play>
  </Gather>
  <Say voice="${voice}" language="en-US">We did not receive an answer. Have a good Shabbat.</Say>
</Response>`;
  }

  const menuText = ttsText || 'Welcome to the Guest House Management Phone Line. To report availability, press 1. To register as a host, press 2. To contact the office, press 3. For admin options, press 8. To leave a message, press 0.';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${functionUrl}/voice-main-menu" numDigits="1" timeout="10">
    <Say voice="${voice}" language="en-US">${menuText}</Say>
  </Gather>
  <Say voice="${voice}" language="en-US">We did not receive an answer. Have a good Shabbat.</Say>
</Response>`;
}

serve(async (req) => {
  try {
    const formData = await req.formData();
    const from = (formData.get('From') as string) || '';
    const to = (formData.get('To') as string) || '';
    const callSid = (formData.get('CallSid') as string) || '';

    console.log(`Incoming call from ${from}, CallSid: ${callSid}`);

    // === FAST PARALLEL: host lookup + recordings only (no external API) ===
    const [hostsRes, recordingsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}&select=id,name,address_1`,
        { headers: DB_HEADERS }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/system_recordings?key=eq.main_menu&is_active=eq.true&select=file_url,use_tts,tts_text`,
        { headers: DB_HEADERS }
      ),
    ]);

    const [hosts, recordings] = await Promise.all([hostsRes.json(), recordingsRes.json()]);
    let host = hosts?.[0];
    const needsEnrichment = !host || !host.name || host.name === 'Unknown Guest' || !host.address_1;
    console.log(`Local DB: ${host ? `found (name: ${host.name}, address_1: ${host.address_1})` : 'not found'}, needs enrichment: ${needsEnrichment}`);

    // Create host if not exists (fast, no external API wait)
    if (!host) {
      try {
        const createRes = await fetch(`${SUPABASE_URL}/rest/v1/hosts`, {
          method: 'POST',
          headers: { ...DB_HEADERS, 'Prefer': 'return=representation' },
          body: JSON.stringify({ phone_number: from, name: 'Unknown Guest', location_type: 'home', total_beds: 0 }),
        });
        const resText = await createRes.text();
        console.log(`Host INSERT status: ${createRes.status}, body: ${resText}`);
        if (createRes.ok) {
          try { host = JSON.parse(resText)?.[0]; } catch (_) {}
        }
      } catch (e) { console.error('Host create error:', e); }
    }

    // Fire-and-forget: log the call
    fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
      method: 'POST',
      headers: { ...DB_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        call_sid: callSid,
        direction: 'inbound',
        from_number: from,
        to_number: to,
        status: 'in-progress',
        host_id: host?.id,
      }),
    }).catch(e => console.error('Call log error:', e));

    // Fire-and-forget: enrich host from external API (runs AFTER response is sent)
    if (needsEnrichment) {
      enrichHostFromExternalApi(from).catch(e => console.error('Enrichment error:', e));
    }

    // Build main menu response
    let recordingUrl: string | undefined;
    let ttsText: string | undefined;
    if (recordings?.[0]?.file_url && !recordings[0].use_tts) {
      recordingUrl = recordings[0].file_url;
    } else if (recordings?.[0]?.tts_text) {
      ttsText = recordings[0].tts_text;
    }

    const laml = mainMenuLaml(SUPABASE_URL, recordingUrl, ttsText);
    return new Response(laml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man">We encountered an error. Goodbye.</Say></Response>`,
      { status: 200, headers: { 'Content-Type': 'application/xml' } }
    );
  }
});
