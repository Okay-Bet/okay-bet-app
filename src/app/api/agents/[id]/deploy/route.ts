import { NextRequest, NextResponse } from 'next/server';

const SPMC_BASE_URL = process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
const API_VERSION = 'v1';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    // Forward request to SPMC API
    const response = await fetch(`${SPMC_BASE_URL}/api/${API_VERSION}/agents/${agentId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 202) {
      // Deployment started successfully (202 Accepted)
      return NextResponse.json(
        { message: 'Deployment started' },
        { status: 202 }
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to deploy agent' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deploying agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
