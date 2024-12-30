// app/api/positions/[address]/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

// Define TypeScript interfaces for better type safety and documentation
interface MarketData {
  question: string;
  outcomes: string; // JSON string of outcomes array
  outcome_prices: string; // JSON string of prices array
}

interface Position {
  condition_id: string;
  token_id: string | null;
  balances: number[];
  prices: number[];
  outcome: number;
  status: string;
  user_address: string;
  market_data?: MarketData; // Optional because positions with missing token_ids won't have market data
}

interface ApiResponse {
  pending_orders: any[]; // Keep as any[] since we're not using this currently
  completed_orders: Position[];
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    const url = `${FASTAPI_BASE_URL}/api/user-orders/${address}`;

    // Debug logging for request
    console.log("=== Next.js API Route Debug ===");
    console.log("Requesting URL:", url);
    console.log("User Address:", address);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // Disable cache as we want real-time position data
    });

    // Log response metadata
    console.log("FastAPI Response Status:", response.status);
    console.log(
      "FastAPI Response Headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("=== Error Response Details ===");
      console.error("Status:", response.status);
      console.error("Raw Error Text:", errorText);
      console.error(
        "Response Headers:",
        Object.fromEntries(response.headers.entries())
      );

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorData.detail || "Failed to fetch positions" },
          { status: response.status }
        );
      } catch (parseError) {
        return NextResponse.json(
          { error: errorText || "Server error" },
          { status: response.status }
        );
      }
    }

    const data = (await response.json()) as ApiResponse;

    // Enhanced validation for the new data structure
    if (!data.completed_orders || !Array.isArray(data.completed_orders)) {
      console.error("Invalid data structure received:", data);
      return NextResponse.json(
        { error: "Invalid data structure from FastAPI" },
        { status: 500 }
      );
    }

    // Validate market data for positions with token_ids
    data.completed_orders.forEach((position, index) => {
      if (position.token_id && !position.market_data) {
        console.warn(
          `Position ${index} has token_id but missing market_data:`,
          position
        );
      }
    });

    // Debug logging for successful response
    console.log("=== Successful Response Data ===");
    console.log("Pending Orders Count:", data.pending_orders?.length || 0);
    console.log("Completed Orders Count:", data.completed_orders?.length || 0);
    console.log(
      "Sample Position with Market Data:",
      data.completed_orders.find((p) => p.market_data)
    );

    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("=== Critical Error Details ===");
    console.error(
      "Error Type:",
      error instanceof Error ? error.constructor.name : typeof error
    );

    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);

      if (error.message.includes("fetch")) {
        console.error("Network Error Details:", {
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
