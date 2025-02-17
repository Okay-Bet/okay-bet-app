import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LimitlessMarket, PolymarketMarket } from "@/components/types";
import { fetchMarketsByIds } from "@/app/api/limitless/markets/utils";

interface GroupedMarketCard {
  id: string;
  limitlessMarket: LimitlessMarket;
  polymarketMatches: {
    market: PolymarketMarket;
    similarity: number;
  }[];
  metrics: {
    totalVolume: number;
    highestLiquidity: number;
    averageSimilarity: number;
  };
}

interface GroupedMarketsResponse {
  success: boolean;
  data: GroupedMarketCard[];
  error?: string;
}

interface PolymarketMatch {
  id: string;
  similarity: number;
}

// New function to fetch Polymarket data using our working endpoint
const fetchPolymarketData = async (
  conditionIds: string[],
  baseUrl: string
): Promise<PolymarketMarket[]> => {
  try {
    const response = await fetch(`${baseUrl}/api/markets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "polymarketByIds",
        conditionIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Polymarket data: ${response.status}`);
    }

    const data = await response.json();
    return data.markets;
  } catch (error) {
    console.error("Error fetching Polymarket data:", error);
    return [];
  }
};

export async function GET(request: Request) {
  try {
    // Get the base URL from the request for making internal API calls
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // First get the grouped market IDs from prisma
    const rawGroupedMarkets = await prisma.groupedMarket.findMany({
      select: {
        id: true,
        limitlessId: true,
        polymarketId: true,
        similarity: true,
      },
      where: {
        limitlessId: {
          not: null,
        },
        polymarketId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by limitlessId
    const groupedByLimitless = rawGroupedMarkets.reduce((acc, market) => {
      if (!market.limitlessId) return acc;

      if (!acc[market.limitlessId]) {
        acc[market.limitlessId] = {
          id: market.id,
          limitlessId: market.limitlessId,
          polymarketMatches: [],
        };
      }

      if (market.polymarketId) {
        acc[market.limitlessId].polymarketMatches.push({
          id: market.polymarketId,
          similarity: market.similarity,
        });
      }

      return acc;
    }, {} as Record<string, any>);

    // Get all unique limitless IDs and Polymarket IDs
    const limitlessIds = Object.keys(groupedByLimitless);
    const polymarketIds = rawGroupedMarkets
      .map((market) => market.polymarketId)
      .filter((id): id is string => id !== null);

    // Fetch both Limitless and Polymarket data concurrently
    const [limitlessMarkets, polymarketMarkets] = await Promise.all([
      fetchMarketsByIds(limitlessIds),
      fetchPolymarketData(polymarketIds, baseUrl),
    ]);

    // Create a map of Polymarket markets by ID for easy lookup
    const polymarketMap = new Map(
      polymarketMarkets.map((market) => [market.id, market])
    );

    // Create final grouped market cards
    const groupedMarketCards: GroupedMarketCard[] = limitlessMarkets.map(
      (limitlessMarket) => {
        const group = groupedByLimitless[limitlessMarket.id];

        // Map polymarket matches to include full market data
        const polymarketMatches = group.polymarketMatches
          .map((match: PolymarketMatch) => {
            const market = polymarketMap.get(match.id);
            if (!market) {
              return null;
            }
            return {
              market,
              similarity: match.similarity,
            };
          })
          .filter(
            (
              match: { market: PolymarketMarket; similarity: number } | null
            ): match is { market: PolymarketMarket; similarity: number } =>
              match !== null
          );

        const similarities = polymarketMatches.map(
          (match: { market: PolymarketMarket; similarity: number }) =>
            match.similarity
        );
        const avgSimilarity =
          similarities.length > 0
            ? similarities.reduce((a: number, b: number) => a + b, 0) /
              similarities.length
            : 0;

        // Calculate combined metrics
        const limitlessVolume = parseFloat(limitlessMarket.metrics.volumeRaw);
        const polymarketVolumes = polymarketMatches.map(
          (match: { market: PolymarketMarket; similarity: number }) =>
            parseFloat(match.market.metrics.volumeRaw)
        );
        const totalVolume =
          limitlessVolume +
          polymarketVolumes.reduce((a: number, b: number) => a + b, 0);

        const limitlessLiquidity = parseFloat(
          limitlessMarket.metrics.liquidityRaw
        );
        const polymarketLiquidities = polymarketMatches.map(
          (match: { market: PolymarketMarket; similarity: number }) =>
            parseFloat(match.market.metrics.liquidityRaw)
        );
        const highestLiquidity = Math.max(
          limitlessLiquidity,
          ...polymarketLiquidities
        );

        return {
          id: group.id,
          limitlessMarket,
          polymarketMatches,
          metrics: {
            totalVolume,
            highestLiquidity,
            averageSimilarity: avgSimilarity,
          },
        };
      }
    );

    const response: GroupedMarketsResponse = {
      success: true,
      data: groupedMarketCards,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching grouped markets:", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch grouped markets",
      },
      { status: 500 }
    );
  }
}
