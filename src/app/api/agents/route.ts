import { NextRequest, NextResponse } from 'next/server';

const SPMC_BASE_URL = process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
const API_VERSION = 'v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward request to SPMC API
    const response = await fetch(`${SPMC_BASE_URL}/api/${API_VERSION}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create agent' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
