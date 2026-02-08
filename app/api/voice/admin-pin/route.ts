import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';

/**
 * Admin PIN entry prompt
 */
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Ask for PIN
    const laml = LaMLResponses.adminPin();
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Admin PIN error:', error);
    
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
