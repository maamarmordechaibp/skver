import { NextRequest, NextResponse } from 'next/server';
import { LaMLResponses } from '@/lib/laml-builder';

/**
 * Handles location type selection and asks for call frequency
 */
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    
    // Validate location type
    if (!['1', '2'].includes(digits)) {
      return new NextResponse(LaMLResponses.registrationLocation(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Ask for call frequency
    const laml = LaMLResponses.registrationFrequency();
    
    return new NextResponse(laml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Frequency selection error:', error);
    
    const errorLaml = LaMLResponses.error();
    return new NextResponse(errorLaml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
