import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (!GOOGLE_SHEETS_URL) {
      console.error('Google Sheets webhook URL not configured');
      return NextResponse.json(
        { error: 'Waitlist service not configured' },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const referrer = request.headers.get('referer') || 'Direct';

    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        timestamp,
        userAgent,
        referrer,
        source: 'okay-bet-landing'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add to waitlist: ${response.status}`);
    }

    const count = await getWaitlistCount();

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully added to waitlist',
      count 
    });
  } catch (error) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await getWaitlistCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching waitlist count:', error);
    return NextResponse.json({ count: 0 });
  }
}

async function getWaitlistCount(): Promise<number> {
  if (!GOOGLE_SHEETS_URL) return 0;
  
  try {
    const countUrl = GOOGLE_SHEETS_URL.replace('/exec', '/exec?action=count');
    const response = await fetch(countUrl);
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch (error) {
    console.error('Error fetching count:', error);
  }
  
  return 0;
}