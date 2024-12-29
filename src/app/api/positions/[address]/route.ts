// app/api/positions/[address]/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    const url = `${FASTAPI_BASE_URL}/api/user-orders/${address}`;
    
    // Log the request details
    console.log('=== Next.js API Route Debug ===');
    console.log('Requesting URL:', url);
    console.log('User Address:', address);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    // Log the response status and headers
    console.log('FastAPI Response Status:', response.status);
    console.log('FastAPI Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== Error Response Details ===');
      console.error('Status:', response.status);
      console.error('Raw Error Text:', errorText);
      console.error('Response Headers:', Object.fromEntries(response.headers.entries()));

      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed Error Data:', errorData);
        return NextResponse.json(
          { error: errorData.detail || "Failed to fetch positions" },
          { status: response.status }
        );
      } catch (parseError) {
        console.error('Error Parsing Response:', parseError);
        return NextResponse.json(
          { error: errorText || "Server error" },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    
    // Log the successful response data
    console.log('=== Successful Response Data ===');
    console.log('Pending Orders Count:', data.pending_orders?.length || 0);
    console.log('Completed Orders Count:', data.completed_orders?.length || 0);
    console.log('Sample Completed Order:', data.completed_orders?.[0]);

    // Add validation for expected data structure
    if (!data.completed_orders || !Array.isArray(data.completed_orders)) {
      console.error('Invalid data structure received:', data);
      return NextResponse.json(
        { error: "Invalid data structure from FastAPI" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error('=== Critical Error Details ===');
    console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
    
    if (error instanceof Error) {
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      
      // Check if it's a network error
      if (error.message.includes('fetch')) {
        console.error('Network Error Details:', {
          baseUrl: FASTAPI_BASE_URL,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}