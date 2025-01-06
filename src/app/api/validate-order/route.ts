// app/api/validate-order/route.ts
import { NextResponse } from "next/server";

// Define the expected response type from FastAPI
interface ValidationResponse {
  valid: boolean;
  estimated_total: number;
  price_impact: number;
  execution_possible: boolean;
  warning: string | null;
  min_order_size: number;
  max_order_size: number;
}

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      "user_address",
      "token_id",
      "price",
      "amount",
      "side",
      "is_yes_token",
    ] as const;

    // Type guard to ensure all required fields exist
    for (const field of requiredFields) {
      if (!(field in body)) {
        console.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    console.log("Sending validation request:", body);

    // Forward validation request to FastAPI
    const response = await fetch(`${FASTAPI_BASE_URL}/api/validate-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI validation error:", errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorData.detail || "Failed to validate order" },
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
    console.log("Validation response:", data);

    // Type check the response
    if (!isValidationResponse(data)) {
      console.error("Invalid response format:", data);
      return NextResponse.json(
        { error: "Invalid response format from server" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("NextJS validation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Type guard function
function isValidationResponse(data: any): data is ValidationResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.valid === "boolean" &&
    typeof data.estimated_total === "number" &&
    typeof data.price_impact === "number" &&
    typeof data.execution_possible === "boolean" &&
    (typeof data.warning === "string" || data.warning === null)
  );
}