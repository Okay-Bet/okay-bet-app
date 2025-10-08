import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';

// Vercel serverless function timeout configuration
export const maxDuration = 10; // Max duration in seconds for Hobby plan

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const group_type = searchParams.get('group_type') || undefined;

    // Create a timeout promise to ensure we don't exceed Vercel limits
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 8000); // 8s to leave buffer
    });

    // Race between the API call and timeout
    const response = await Promise.race([
      spmcClient.listGroups({
        limit,
        offset,
        group_type
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
        { error: response.error?.message || 'Failed to fetch groups' },
        { status }
      );
    }
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await spmcClient.createGroup({
      title: body.title,
      description: body.description,
      group_type: body.group_type || 'watchlist',
      markets: body.markets || []
    });

    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to create group' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}