import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';

/**
 * Outbound call to a host - asks them about availability
 */
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaign_id') as string;
    const hostId = searchParams.get('host_id') as string;
    const hostName = searchParams.get('host_name') as string;
    const totalBeds = parseInt(searchParams.get('total_beds') || '0', 10);
    const messageUrl = searchParams.get('message_url') || undefined;
    
    const laml = LaMLResponses.outboundCall(hostName, totalBeds, messageUrl);
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Outbound call error:', error);
    
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
