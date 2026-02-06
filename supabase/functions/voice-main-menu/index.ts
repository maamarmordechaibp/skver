/**
 * voice-main-menu - Main menu selection for phone system
 * Routes based on digit pressed: 1=availability, 2=register, 3=office, 8=admin, 0=voicemail
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req) => {
  try {
    const formData = await req.formData();
    const digits = (formData.get('Digits') as string) || '';
    const from = (formData.get('From') as string) || '';

    console.log(`Main menu selection: ${digits} from ${from}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const baseUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1';

    let laml = '';

    switch (digits) {
      case '1': {
        // Check if registered using fetch
        const hostRes = await fetch(
          `${supabaseUrl}/rest/v1/hosts?phone_number=eq.${encodeURIComponent(from)}&select=is_registered`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
        const hosts = await hostRes.json();
        const host = hosts?.[0];

        const endpoint = host?.is_registered
          ? '/voice-option-1-registered'
          : '/voice-option-1-new';

        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${baseUrl}${endpoint}?from=${encodeURIComponent(from)}</Redirect>
</Response>`;
        break;
      }

      case '2':
        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${baseUrl}/voice-registration?from=${encodeURIComponent(from)}</Redirect>
</Response>`;
        break;

      case '3':
        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Connecting you to the office. Please hold.</Say>
  <Dial timeout="30">+1234567890</Dial>
</Response>`;
        break;

      case '8':
        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${baseUrl}/voice-admin-pin</Redirect>
</Response>`;
        break;

      case '0':
        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${baseUrl}/voice-voicemail?from=${encodeURIComponent(from)}</Redirect>
</Response>`;
        break;

      default:
        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Invalid option. Goodbye.</Say>
</Response>`;
    }

    return new Response(laml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error in voice-main-menu:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Sorry, there was an error. Please try again later.</Say>
</Response>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
});
