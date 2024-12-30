// app/api/polymarket-markets/[eventId]/route.ts
import { NextResponse } from "next/server";
import { Market } from "@/components/types/market";
import { transformMarket } from "@/utils/transforms";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const url = `${GAMMA_API_URL}/events?closed=false&id=${eventId}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[API] Gamma API error: ${response.status} ${response.statusText}`
      );
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.error("[API] Invalid data format or empty response");
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = data[0];

    if (!event || !Array.isArray(event.markets)) {
      console.error("[API] Event found but markets array is invalid", {
        event,
      });
      return NextResponse.json(
        { error: "Invalid market data" },
        { status: 400 }
      );
    }

    // Transform markets directly without the orderbook abstraction
    const transformedMarkets = event.markets
      .filter((market) => market && typeof market === "object")
      .map((market) => {
        try {
          // Pass the market data directly to transform
          return transformMarket(market);
        } catch (e) {
          console.error("[API] Error transforming market:", e, { market });
          return null;
        }
      })
      .filter((market) => market !== null);

    if (transformedMarkets.length === 0) {
      console.error("[API] No valid markets after transformation");
      return NextResponse.json(
        { error: "No valid markets found" },
        { status: 400 }
      );
    }

    return NextResponse.json(transformedMarkets);
  } catch (error) {
    console.error("[API] Error processing request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
