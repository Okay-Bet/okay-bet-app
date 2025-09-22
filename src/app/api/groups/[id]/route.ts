import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await spmcClient.getGroup(params.id);
    
    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Group not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const response = await spmcClient.updateGroup(params.id, {
      title: body.title,
      description: body.description,
      metadata: body.metadata,
      display_settings: body.display_settings
    });
    
    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to update group' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await spmcClient.deleteGroup(params.id);
    
    if (response.success) {
      return NextResponse.json({ message: 'Group deleted successfully' });
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to delete group' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}