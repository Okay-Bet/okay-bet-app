// app/api/polymarket-markets/[eventId]/route.ts
import { NextResponse } from "next/server";
import { Market } from "@/components/types/market";
import { transformMarket } from "@/utils/market";

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
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const event = data[0];

    if (!event || !event.markets) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const transformedMarkets = event.markets.map(transformMarket);

    return NextResponse.json(transformedMarkets);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}