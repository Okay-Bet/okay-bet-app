// app/api/delegated-order/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Log the received body for debugging
    console.log("Received order body:", body);

    // Update required fields - removed signature and nonce requirements
    const requiredFields = [
      "user_address",
      "market_id",
      "price",
      "amount",
      "side",
    ];

    // Validate required fields
    for (const field of requiredFields) {
      if (!(field in body)) {
        console.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate order side
    if (!["BUY", "SELL"].includes(body.side)) {
      return NextResponse.json(
        { error: "Order side must be either 'BUY' or 'SELL'" },
        { status: 400 }
      );
    }

    // Forward request to FastAPI
    console.log("Forwarding to FastAPI:", `${FASTAPI_BASE_URL}/api/delegated-order`);
    
    const response = await fetch(`${FASTAPI_BASE_URL}/api/delegated-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorData.detail || "Failed to submit order" },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { error: errorText || "Server error" },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("NextJS route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}