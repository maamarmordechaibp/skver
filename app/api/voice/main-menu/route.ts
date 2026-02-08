import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    
    let redirectUrl = '';
    let directResponse = '';
    
    switch (digits) {
      case '1':
        // Check if registered and go to availability
        redirectUrl = `/api/voice/option-1?From=${encodeURIComponent(from)}&CallSid=${callSid}`;
        break;
        
      case '2':
        // Registration flow
        redirectUrl = `/api/voice/registration?From=${encodeURIComponent(from)}&CallSid=${callSid}`;
        break;
        
      case '3':
        // Transfer to office
        directResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Connecting you to the office. Please hold.</Say>
  <Dial timeout="30">${process.env.NEXT_PUBLIC_APP_URL || '+18459350513'}</Dial>
</Response>`;
        break;
        
      case '8':
        // Admin options
        redirectUrl = `/api/voice/admin-pin?CallSid=${callSid}`;
        break;
        
      case '0':
        // Voicemail
        redirectUrl = `/api/voice/voicemail?From=${encodeURIComponent(from)}&CallSid=${callSid}`;
        break;
        
      default:
        // Invalid option
        directResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Invalid option. Goodbye.</Say>
</Response>`;
    }
    
    if (directResponse) {
      return new NextResponse(directResponse, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    if (redirectUrl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const fullUrl = `${appUrl}${redirectUrl}`;
      
      const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${fullUrl}</Redirect>
</Response>`;
      
      return new NextResponse(laml, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Fallback
    const errorLaml = LaMLResponses.mainMenu(process.env.NEXT_PUBLIC_APP_URL || '');
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Main menu error:', error);
    
    const errorLaml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">We encountered an error. Goodbye.</Say>
</Response>`;
    
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
