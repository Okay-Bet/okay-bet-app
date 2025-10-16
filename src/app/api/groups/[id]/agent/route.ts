import { NextRequest, NextResponse } from 'next/server';

const SPMC_BASE_URL = process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
const API_VERSION = 'v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;

    // Forward request to SPMC API
    const response = await fetch(`${SPMC_BASE_URL}/api/${API_VERSION}/groups/${groupId}/agent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 404) {
      // No agent found for this group
      return NextResponse.json(
        { error: 'No agent found for this group' },
        { status: 404 }
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to get agent' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting agent by group ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
