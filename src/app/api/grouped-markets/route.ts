import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LimitlessMarket } from "@/components/types";
import { fetchMarketsByIds } from "@/app/api/limitless/markets/utils";

interface GroupedMarketCard {
  id: string; // GroupedMarket id
  limitlessMarket: LimitlessMarket; // Full limitless market data
  polymarketMatches: {
    id: string; // Polymarket id (just id for now)
    similarity: number; // Similarity score from matching
  }[];
  metrics: {
    totalVolume: number; // Just limitless volume for now
    highestLiquidity: number; // Limitless liquidity
    averageSimilarity: number; // Average similarity score
  };
}

interface GroupedMarketsResponse {
  success: boolean;
  data: GroupedMarketCard[];
  error?: string;
}

export async function GET() {
  try {
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

    // Get all unique limitless IDs
    const limitlessIds = Object.keys(groupedByLimitless);

    // Fetch limitless markets
    const limitlessMarkets = await fetchMarketsByIds(limitlessIds);

    // Create final grouped market cards
    const groupedMarketCards: GroupedMarketCard[] = limitlessMarkets.map(
      (limitlessMarket) => {
        const group = groupedByLimitless[limitlessMarket.id];
        const similarities = group.polymarketMatches.map(
          (match) => match.similarity
        );
        const avgSimilarity =
          similarities.reduce((a, b) => a + b, 0) / similarities.length;

        return {
          id: group.id,
          limitlessMarket,
          polymarketMatches: group.polymarketMatches,
          metrics: {
            totalVolume: parseFloat(limitlessMarket.metrics.volumeRaw),
            highestLiquidity: parseFloat(limitlessMarket.metrics.liquidityRaw),
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
