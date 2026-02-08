import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';
import { getOrCreateHost } from '@/lib/supabase-server';

/**
 * Saves the beds entered by a new host and asks for location type
 */
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('From') as string;
    const callSid = searchParams.get('CallSid') as string;
    
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    
    // Store beds in session (in production, use distributed sessions)
    // For now, we'll just proceed to next step
    const beds = parseInt(digits, 10);
    
    if (isNaN(beds) || beds < 0) {
      return new NextResponse(LaMLResponses.registrationBeds(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Ask for location type
    const laml = LaMLResponses.registrationLocation();
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Save beds error:', error);
    
    const errorLaml = LaMLResponses.error();
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
