import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';

/**
 * Admin PIN entry and verification
 */
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callSid = searchParams.get('CallSid') as string;
    
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    
    // Get the PIN from env or database
    const correctPin = process.env.ADMIN_PIN || '1234';
    
    if (digits === correctPin) {
      // PIN correct - ask for beds needed
      const laml = LaMLResponses.adminBedsNeeded();
      return new NextResponse(laml, {
        headers: { 'Content-Type': 'text/xml' },
      });
    } else {
      // PIN incorrect
      const errorLaml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Incorrect code. Goodbye.</Say>
</Response>`;
      
      return new NextResponse(errorLaml, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
  } catch (error) {
    console.error('Admin PIN verification error:', error);
    
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
