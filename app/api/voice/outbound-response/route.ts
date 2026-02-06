import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';
import { saveResponse, updateQueueStatus } from '@/lib/supabase-server';

/**
 * Handles host responses to outbound campaign calls
 * Options: 1=accept, 2=change beds, 3=decline
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaign_id') as string;
    const hostId = searchParams.get('host_id') as string;
    const hostName = searchParams.get('host_name') as string;
    const totalBeds = parseInt(searchParams.get('total_beds') || '0', 10);
    
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    
    let laml = '';
    
    switch (digits) {
      case '1': // Accept
        await saveResponse(
          campaignId,
          hostId,
          totalBeds,
          'accepted',
          'outbound_call'
        );
        
        await updateQueueStatus(
          campaignId,
          hostId,
          'accepted',
          new Date().toISOString()
        );
        
        laml = LaMLResponses.acceptedResponse();
        break;
        
      case '2': // Change beds
        laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/voice/outbound-update-beds?campaign_id=${campaignId}&host_id=${hostId}" finishOnKey="#" timeout="15">
    <Say voice="man" language="en-US">
      Please enter the number of beds available and press pound.
    </Say>
  </Gather>
</Response>`;
        break;
        
      case '3': // Decline
        await saveResponse(
          campaignId,
          hostId,
          0,
          'declined',
          'outbound_call'
        );
        
        await updateQueueStatus(
          campaignId,
          hostId,
          'declined',
          new Date().toISOString()
        );
        
        laml = LaMLResponses.declinedResponse();
        break;
        
      default:
        laml = LaMLResponses.outboundCall(hostName, totalBeds);
    }
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Outbound response error:', error);
    
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
