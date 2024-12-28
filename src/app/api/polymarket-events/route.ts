// app/api/polymarket-events/route.ts
import { NextResponse } from "next/server";
import { Event, SearchParams } from "@/app/types/market";
import { transformEvent, searchEvents } from "@/utils/transforms";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const MAX_RESULTS = 20;

export async function POST(request: Request) {
  try {
    const { searchParams, limit }: { searchParams?: SearchParams; limit?: number } = await request.json();
    
    const queryParams = new URLSearchParams();
    queryParams.append("closed", "false");
    queryParams.append("limit", (limit || 100).toString());

    if (searchParams) {
      // Add search parameters to query
      if (searchParams.endDateMin) queryParams.append("end_date_min", searchParams.endDateMin);
      if (searchParams.endDateMax) queryParams.append("end_date_max", searchParams.endDateMax);
      if (searchParams.liquidityMin) queryParams.append("liquidity_min", searchParams.liquidityMin.toString());
      if (searchParams.liquidityMax) queryParams.append("liquidity_max", searchParams.liquidityMax.toString());
      if (searchParams.volumeMin) queryParams.append("volume_min", searchParams.volumeMin.toString());
      if (searchParams.volumeMax) queryParams.append("volume_max", searchParams.volumeMax.toString());
    }

    const url = `${GAMMA_API_URL}/events?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const events = searchEvents(
      data,
      searchParams?.searchTerm || "",
      searchParams?.sortBy || "liquidity",
      searchParams?.sortDirection || "desc"
    );

    const transformedEvents = events.map(transformEvent);

    return NextResponse.json({
      events: transformedEvents,
      total: transformedEvents.length,
      hasMore: events.length >= MAX_RESULTS,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
