import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';

/**
 * Saves the beds needed for the campaign
 */
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    
    // Parse beds
    const beds = parseInt(digits, 10);
    
    if (isNaN(beds) || beds <= 0) {
      return new NextResponse(LaMLResponses.adminBedsNeeded(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Ask to record custom message
    const laml = LaMLResponses.adminRecordMessage();
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Admin beds error:', error);
    
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
