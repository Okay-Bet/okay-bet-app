import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LimitlessMarket, PolymarketMarket } from "@/components/types";
import { fetchMarketsByIds } from "@/app/api/limitless/markets/utils";
import { fetchPolymarketData } from "@/app/api/markets/utils"; // Update this import

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
    platforms: {
      limitless: {
        volume: number;
        openInterest: number;
      };
      polymarket: {
        matches: Array<{
          id: string;
          volume: number;
          liquidity: number;
        }>;
      };
    };
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

export async function GET(request: Request) {
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

    // Get all unique limitless IDs and Polymarket IDs
    const limitlessIds = Object.keys(groupedByLimitless);
    const polymarketIds = rawGroupedMarkets
      .map((market) => market.polymarketId)
      .filter((id): id is string => id !== null);

    // Fetch both Limitless and Polymarket data concurrently
    const [limitlessMarkets, polymarketMarkets] = await Promise.all([
      fetchMarketsByIds(limitlessIds),
      fetchPolymarketData(polymarketIds), // No need to pass baseUrl
    ]);

    // Create a map of Polymarket markets by ID for easy lookup
    const polymarketMap = new Map(
      polymarketMarkets.map((market) => [market.id, market])
    );

    // Create final grouped market cards
    const groupedMarketCards: GroupedMarketCard[] = limitlessMarkets.map(
      (limitlessMarket) => {
        const group = groupedByLimitless[limitlessMarket.id];

        // Keep Polymarket matches handling the same
        const polymarketMatches = group.polymarketMatches
          .map((match: PolymarketMatch) => {
            const market = polymarketMap.get(match.id);
            if (!market) {
              return null;
            }

            const volume = parseFloat(market.metrics.volumeRaw);
            const liquidity = parseFloat(market.metrics.liquidityRaw);

            return {
              market,
              similarity: match.similarity,
              metrics: {
                volume: isNaN(volume) ? 0 : volume,
                liquidity: isNaN(liquidity) ? 0 : liquidity,
              },
            };
          })
          .filter(
            (
              match: PolymarketMatch | null
            ): match is PolymarketMatch & { market: PolymarketMarket } =>
              match !== null
          );

        // Calculate platform metrics
        const limitlessVolume = parseFloat(limitlessMarket.metrics.volumeRaw);
        const limitlessOpenInterest = parseFloat(
          limitlessMarket.metrics.openInterestRaw
        );

        const polymarketMetrics = polymarketMatches.map(
          (match: {
            market: PolymarketMarket;
            similarity: number;
            metrics: { volume: number; liquidity: number };
          }) => ({
            id: match.market.id,
            volume: match.metrics.volume,
            liquidity: match.metrics.liquidity, // Keep for Polymarket
          })
        );

        const totalVolume =
          limitlessVolume +
          polymarketMetrics.reduce(
            (sum: number, m: { volume: number }) => sum + m.volume,
            0
          );

        // For highest liquidity, compare Polymarket liquidity with Limitless open interest
        const highestLiquidity = Math.max(
          limitlessOpenInterest,
          ...polymarketMetrics.map((m: { liquidity: number }) => m.liquidity)
        );

        const card: GroupedMarketCard = {
          id: group.id,
          limitlessMarket,
          polymarketMatches,
          metrics: {
            totalVolume,
            highestLiquidity,
            platforms: {
              limitless: {
                volume: limitlessVolume,
                openInterest: limitlessOpenInterest,
              },
              polymarket: {
                matches: polymarketMetrics,
              },
            },
          },
        };

        return card;
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
