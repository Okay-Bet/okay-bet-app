// app/api/polymarket-credentials/route.ts
// takes a user signed message an derives/creates an api key for it
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const headers = {
      'POLY_ADDRESS': request.headers.get('POLY_ADDRESS') || '',
      'POLY_SIGNATURE': request.headers.get('POLY_SIGNATURE') || '',
      'POLY_TIMESTAMP': request.headers.get('POLY_TIMESTAMP') || '',
      'POLY_NONCE': request.headers.get('POLY_NONCE') || '0',
    };

    const response = await fetch('http://167.71.208.166/api/credentials', {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch credentials');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}