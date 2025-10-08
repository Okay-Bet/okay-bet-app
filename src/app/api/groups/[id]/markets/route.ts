import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body.markets)) {
      return NextResponse.json(
        { error: 'Markets must be an array' },
        { status: 400 }
      );
    }
    
    const response = await spmcClient.addMarketsToGroup(params.id, body.markets);
    
    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to add markets to group' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error adding markets to group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}