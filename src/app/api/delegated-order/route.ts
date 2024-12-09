// app/api/delegated-order/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";
const AGENT_WALLET_ADDRESS = "0x93c7c3f9394dEf62D2Ad0658c1c9b49919C13Ac5";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received order body:", body);

    // Validate required fields including USDC transaction hash
    const requiredFields = [
      "user_address",
      "market_id",
      "price",
      "amount",
      "side",
      "usdc_transaction_hash"
    ];

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
    const response = await fetch(`${FASTAPI_BASE_URL}/api/delegated-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        agent_wallet: AGENT_WALLET_ADDRESS
      }),
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
