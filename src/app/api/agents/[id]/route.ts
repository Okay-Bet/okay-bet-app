import { NextRequest, NextResponse } from 'next/server';

const SPMC_BASE_URL = process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
const API_VERSION = 'v1';

// Proxy DELETE requests until SPMC adds DELETE to CORS allowed methods
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    // Get query parameters from request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // Build URL with query parameters
    const url = `${SPMC_BASE_URL}/api/${API_VERSION}/agents/${agentId}${queryString ? `?${queryString}` : ''}`;

    // Forward request to SPMC API
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error(`SPMC DELETE agent failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error: data.detail || 'Failed to delete agent',
          spmc_status: response.status,
          spmc_error: data
        },
        { status: response.status }
      );
    }

    // DELETE typically returns 204 No Content
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
