import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';
import { getHostByPhone } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('From') as string;
    const callSid = searchParams.get('CallSid') as string;
    
    // Get host information
    const host = await getHostByPhone(from);
    
    let laml = '';
    
    if (host && host.is_registered) {
      // Registered host - show their current info
      laml = LaMLResponses.registeredHostMenu(
        host.name || 'Guest',
        host.total_beds,
        process.env.NEXT_PUBLIC_APP_URL || ''
      );
    } else {
      // Unregistered host - ask for beds
      laml = LaMLResponses.unregisteredHostMenu();
    }
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Option 1 error:', error);
    
    const errorLaml = LaMLResponses.error();
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
