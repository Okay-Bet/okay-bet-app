import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const group_type = searchParams.get('group_type') || undefined;

    const response = await spmcClient.listGroups({ 
      limit, 
      offset, 
      group_type 
    });

    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch groups' },
        { status: 500 }
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