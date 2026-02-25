/**
 * voice-save-new-beds - Save beds for unregistered caller
 * Also enriches host with name/address from external API
 * Also records a response to the active campaign if one exists
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const EXTERNAL_API_KEY = Deno.env.get('EXTERNAL_API_KEY') || '';
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
    const from = url.searchParams.get('from') || '';

    const formData = await req.formData();
    const beds = (formData.get('Digits') as string) || '0';
    const bedsNum = parseInt(beds, 10);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const dbHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    console.log(`Saving ${bedsNum} beds for ${from}`);

    // Look up contact from external API for name/address enrichment
    const contact = await lookupContact(from);
    const updateData: Record<string, any> = { total_beds: bedsNum, is_registered: true };
    if (contact) {
      const name = [contact.first_name || '', contact.last_name || ''].filter(Boolean).join(' ').trim();
      if (name) updateData.name = name;
      const address1 = [contact.street_number || '', contact.street || ''].filter(Boolean).join(' ').trim();
      if (address1) updateData.address_1 = address1;
      if (contact.apartment) updateData.address_2 = contact.apartment;
      if (contact.city) updateData.city = contact.city;
      if (contact.state) updateData.state = contact.state;
      if (contact.zip) updateData.zip = contact.zip;
      console.log('Enriching host with external data:', JSON.stringify(updateData));
    }

    // Update host via REST + get host id back
    let hostId: string | null = null;
    if (from) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}`,
        {
          method: 'PATCH',
          headers: { ...dbHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify(updateData),
        }
      );
      const updated = await res.json();
      hostId = updated?.[0]?.id || null;
      console.log('Host update status:', res.status, 'hostId:', hostId);
    }

    // Record response to active campaign if exists
    if (hostId && bedsNum > 0) {
      try {
        const campRes = await fetch(
          `${supabaseUrl}/rest/v1/campaigns?status=eq.active&order=created_at.desc&limit=1&select=id,beds_confirmed`,
          { headers: dbHeaders }
        );
        const campaigns = await campRes.json();
        const campaign = campaigns?.[0];
        if (campaign) {
          // Save response
          await fetch(`${supabaseUrl}/rest/v1/responses`, {
            method: 'POST',
            headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              campaign_id: campaign.id,
              host_id: hostId,
              beds_offered: bedsNum,
              response_type: 'accepted',
              response_method: 'inbound_call',
            }),
          });
          // Update beds_confirmed
          await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${campaign.id}`, {
            method: 'PATCH',
            headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ beds_confirmed: (campaign.beds_confirmed || 0) + bedsNum }),
          });
          console.log(`Recorded ${bedsNum} beds for campaign ${campaign.id}`);
        }
      } catch (e) { console.error('Campaign response error:', e); }
    }

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">
    Thank you! You have registered ${bedsNum} beds. We will contact you when guests need accommodation. Have a wonderful Shabbat!
  </Say>
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
