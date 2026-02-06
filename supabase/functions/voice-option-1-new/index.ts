/**
 * voice-option-1-new - Handler for unregistered callers
 * Checks campaign capacity first, then asks for beds or says all full
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const searchParams = new URL(req.url).searchParams;
    const from = searchParams.get('from') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';
    const dbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

    // Check all active campaigns to see if any still need beds
    const campRes = await fetch(
      `${supabaseUrl}/rest/v1/campaigns?status=eq.active&select=beds_needed,beds_confirmed`,
      { headers: dbHeaders }
    );
    const campaigns = await campRes.json();

    const activeCampaigns = Array.isArray(campaigns) ? campaigns : [];
    const allFull = activeCampaigns.length > 0 && activeCampaigns.every(
      (c: any) => c.beds_needed > 0 && c.beds_confirmed >= c.beds_needed
    );

    console.log(`voice-option-1-new: ${activeCampaigns.length} active campaigns, allFull=${allFull}`);

    let laml: string;

    if (allFull) {
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">All beds are completed for this week. We don't need any beds at this time. Thank you for your willingness to help. Have a good Shabbat.</Say>
</Response>`;
    } else {
      laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/voice-save-new-beds?from=${encodeURIComponent(from)}" numDigits="2" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      We have your number but you are not yet registered. Please enter the number of beds available, then press pound.
    </Say>
  </Gather>
</Response>`;
    }

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
