import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';
import { getOrCreateHost, logCall } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    // Get or create host record
    const host = await getOrCreateHost(from);
    
    // Log the call
    await logCall(
      callSid,
      'inbound',
      from,
      to || process.env.SIGNALWIRE_PHONE_NUMBER || '',
      'in-progress',
      host.id
    );
    
    // Return main menu
    const laml = LaMLResponses.mainMenu(process.env.NEXT_PUBLIC_APP_URL || '');
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Incoming call error:', error);
    
    // Return error response
    const errorLaml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="man" language="en-US">We encountered an error. Goodbye.</Say></Response>';
    
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
