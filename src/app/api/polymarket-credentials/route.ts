// app/api/polymarket-credentials/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.address || !body.signature || !body.timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const headers = {
      POLY_ADDRESS: body.address,
      POLY_SIGNATURE: body.signature,
      POLY_TIMESTAMP: body.timestamp,
      POLY_NONCE: body.nonce || "0",
      "Content-Type": "application/json",
    };

    console.log("FastAPI Request:", {
      url: `${FASTAPI_BASE_URL}/api/credentials`,
      headers: {
        ...headers,
        POLY_SIGNATURE: headers["POLY_SIGNATURE"].substring(0, 10) + "...",
      },
    });

    const response = await fetch(`${FASTAPI_BASE_URL}/api/credentials`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI error:", errorText);

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorData.detail || "Failed to fetch credentials" },
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
