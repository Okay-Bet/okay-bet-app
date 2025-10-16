import { NextRequest, NextResponse } from 'next/server';

const SPMC_BASE_URL = process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
const API_VERSION = 'v1';

export async function GET(request: NextRequest) {
  try {
    // Fetch all groups
    const groupsResponse = await fetch(`${SPMC_BASE_URL}/api/${API_VERSION}/groups?limit=100`);

    if (!groupsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: groupsResponse.status }
      );
    }

    const groupsData = await groupsResponse.json();
    const groups = groupsData.groups || [];

    // Fetch agent for each group
    const agentPromises = groups.map(async (group: any) => {
      try {
        const agentResponse = await fetch(`${SPMC_BASE_URL}/api/${API_VERSION}/groups/${group.id}/agent`);

        if (agentResponse.ok) {
          const agent = await agentResponse.json();
          return {
            ...agent,
            group_title: group.title,
            group_type: group.group_type
          };
        }
        return null;
      } catch {
        return null;
      }
    });

    const agents = (await Promise.all(agentPromises)).filter(agent => agent !== null);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward request to SPMC API
    const response = await fetch(`${SPMC_BASE_URL}/api/${API_VERSION}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create agent' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
