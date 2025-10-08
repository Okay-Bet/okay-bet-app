import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';
import { Platform } from '@/services/spmc/types';

/**
 * POST /api/spmc/prices
 *
 * Proxies market price requests to SPMC API to avoid CORS issues
 *
 * Body:
 * {
 *   marketIds: string[],
 *   platforms?: Platform[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.marketIds || !Array.isArray(body.marketIds)) {
      return NextResponse.json(
        { error: 'marketIds array is required' },
        { status: 400 }
      );
    }

    const response = await spmcClient.getMarketPrices({
      marketIds: body.marketIds,
      platforms: body.platforms
    });

    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch prices' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching market prices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
