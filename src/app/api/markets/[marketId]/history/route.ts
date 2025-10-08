import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';

// Vercel serverless function timeout configuration
export const maxDuration = 10; // Max duration in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: { marketId: string } }
) {
  try {
    const { marketId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const interval = searchParams.get('interval') || '1d';
    const fidelity = searchParams.get('fidelity')
      ? parseInt(searchParams.get('fidelity')!)
      : undefined;
    const startTime = searchParams.get('startTime')
      ? parseInt(searchParams.get('startTime')!)
      : undefined;
    const endTime = searchParams.get('endTime')
      ? parseInt(searchParams.get('endTime')!)
      : undefined;

    // Create a timeout promise to ensure we don't exceed Vercel limits
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 8000); // 8s to leave buffer
    });

    // Race between the API call and timeout
    const response = await Promise.race([
      spmcClient.getMarketHistory({
        marketId,
        interval: interval as any,
        fidelity,
        startTime,
        endTime
      }),
      timeoutPromise
    ]).catch((error) => {
      console.error('SPMC API timeout or error:', error);
      return {
        success: false,
        error: { status: 504, message: 'SPMC API timeout' }
      };
    }) as any;

    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      const status = response.error?.status || 500;
      return NextResponse.json(
        { error: response.error?.message || 'Failed to fetch market history' },
        { status }
      );
    }
  } catch (error) {
    console.error('Error fetching market history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
