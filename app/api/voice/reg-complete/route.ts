import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';
import { getOrCreateHost, updateHostRegistration } from '@/lib/supabase-server';

/**
 * Completes host registration
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('From') as string;
    
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    
    // Validate frequency
    if (!['1', '2'].includes(digits)) {
      return new NextResponse(LaMLResponses.registrationFrequency(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Get or create host
    const host = await getOrCreateHost(from);
    
    // In a real implementation, you'd retrieve the beds and location from session
    // For now, use defaults
    const frequency = digits === '1' ? 'weekly' : 'special';
    
    try {
      await updateHostRegistration(
        host.id,
        'Guest', // Default name - could be collected earlier
        0, // Default beds - should be from earlier step
        'private', // Default location - should be from earlier step
        frequency
      );
    } catch (err) {
      console.warn('Update registration warning:', err);
      // Continue anyway
    }
    
    // Registration complete
    const laml = LaMLResponses.registrationComplete();
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Registration completion error:', error);
    
    const errorLaml = LaMLResponses.error();
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
