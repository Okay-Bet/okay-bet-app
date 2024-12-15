// app/api/positions/[address]/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    console.log(`Fetching positions for address: ${address}`);

    // Log the full URL we're attempting to connect to
    const url = `${FASTAPI_BASE_URL}/api/user-orders/${address}`;
    console.log("Attempting to fetch from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add any additional headers that the working route might have
      },
      // Add a reasonable timeout
      next: { revalidate: 0 }, // Disable cache
    });

    // Log response status and headers
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from FastAPI:", errorText);
      console.error("Response status:", response.status);

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorData.detail || "Failed to fetch positions" },
          { status: response.status }
        );
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
        return NextResponse.json(
          { error: errorText || "Server error" },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    console.log("Raw FastAPI response:", JSON.stringify(data, null, 2));

    // Add CORS headers if needed
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("NextJS route error:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
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

// Add OPTIONS handler for CORS if needed
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
