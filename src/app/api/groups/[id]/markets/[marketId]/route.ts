import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; marketId: string } }
) {
  try {
    const response = await spmcClient.removeMarketFromGroup(
      params.id, 
      params.marketId
    );
    
    if (response.success) {
      return NextResponse.json({ 
        message: 'Market removed from group successfully' 
      });
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to remove market from group' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error removing market from group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}