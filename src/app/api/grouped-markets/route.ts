import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LimitlessMarket,
  PolymarketMarket,
  KalshiMarket,
} from "@/components/types";
import { fetchMarketsByIds } from "@/app/api/limitless/markets/utils";
import { fetchPolymarketData } from "@/app/api/markets/utils";
import { fetchKalshiMarkets } from "@/app/api/kalshi/utils"; // Add this import

interface GroupedMarketCard {
  id: string;
  limitlessMarkets: {
    market: LimitlessMarket;
    similarity: number | null;
  }[];
  polymarketMarkets: {
    market: PolymarketMarket;
    similarity: number | null;
  }[];
  kalshiMarkets: {
    market: KalshiMarket;
    similarity: number | null;
  }[];
  metrics: {
    totalVolume: number;
    highestLiquidity: number;
    platforms: {
      limitless: {
        markets: Array<{
          id: string;
          volume: number;
          openInterest: number;
        }>;
      };
      polymarket: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity: number;
        }>;
      };
      kalshi: {
        markets: Array<{
          id: string;
          volume: number;
          liquidity: number;
          openInterest: number;
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

export async function GET(request: Request) {
  try {
    // Fetch all grouped markets with their relationships
    const groupedMarkets = await prisma.groupedMarket.findMany({
      include: {
        limitlessMarkets: {
          include: {
            market: true,
          },
        },
        polymarketMarkets: {
          include: {
            market: true,
          },
        },
        kalshiMarkets: {
          include: {
            market: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get unique IDs for each platform
    const limitlessIds = [
      ...new Set(
        groupedMarkets.flatMap((gm) =>
          gm.limitlessMarkets.map((m) => m.marketId)
        )
      ),
    ];
    const polymarketIds = [
      ...new Set(
        groupedMarkets.flatMap((gm) =>
          gm.polymarketMarkets.map((m) => m.marketId)
        )
      ),
    ];
    const kalshiIds = [
      ...new Set(
        groupedMarkets.flatMap((gm) => gm.kalshiMarkets.map((m) => m.marketId))
      ),
    ];

    // Fetch latest market data from all platforms
    const [limitlessMarkets, polymarketMarkets, kalshiMarkets] =
      await Promise.all([
        fetchMarketsByIds(limitlessIds),
        fetchPolymarketData(polymarketIds),
        fetchKalshiMarkets(kalshiIds),
      ]);

    // Create maps for quick lookup
    const limitlessMap = new Map(limitlessMarkets.map((m) => [m.id, m]));
    const polymarketMap = new Map(polymarketMarkets.map((m) => [m.id, m]));
    const kalshiMap = new Map(kalshiMarkets.map((m) => [m.id, m]));

    // Transform into GroupedMarketCards
    const groupedMarketCards: GroupedMarketCard[] = groupedMarkets.map(
      (group) => {
        // Process markets for each platform
        const limitlessProcessed = group.limitlessMarkets.map((lm) => ({
          market: limitlessMap.get(lm.marketId) as LimitlessMarket || lm.market,
          similarity: lm.similarity,
        }));

        const polymarketProcessed = group.polymarketMarkets.map((pm) => ({
          market: polymarketMap.get(pm.marketId) as PolymarketMarket || pm.market,
          similarity: pm.similarity,
        }));

        const kalshiProcessed = group.kalshiMarkets.map((km) => ({
          market: kalshiMap.get(km.marketId) as KalshiMarket || km.market,
          similarity: km.similarity,
        }));

        // Calculate metrics
        const metrics = {
          totalVolume: 0,
          highestLiquidity: 0,
          platforms: {
            limitless: {
              markets: limitlessProcessed.map((lm) => ({
                id: lm.market.id,
                volume: parseFloat(lm.market.metrics.volume || "0"),
                openInterest: parseFloat(lm.market.metrics.openInterest || "0"),
              })),
            },
            polymarket: {
              markets: polymarketProcessed.map((pm) => ({
                id: pm.market.id,
                volume: parseFloat(pm.market.metrics.volume || "0"),
                liquidity: parseFloat(pm.market.metrics.liquidity || "0"),
              })),
            },
            kalshi: {
              markets: kalshiProcessed.map((km) => ({
                id: km.market.id,
                volume: parseFloat(km.market.metrics.volume || "0"),
                liquidity: parseFloat(km.market.metrics.liquidity || "0"),
                openInterest: parseFloat(km.market.metrics.openInterest || "0"),
              })),
            },
          },
        };

        // Calculate total volume and highest liquidity
        metrics.totalVolume = [
          ...metrics.platforms.limitless.markets.map((m) => m.volume),
          ...metrics.platforms.polymarket.markets.map((m) => m.volume),
          ...metrics.platforms.kalshi.markets.map((m) => m.volume),
        ].reduce((sum, vol) => sum + (isNaN(vol) ? 0 : vol), 0);

        metrics.highestLiquidity = Math.max(
          ...metrics.platforms.limitless.markets.map((m) => m.openInterest),
          ...metrics.platforms.polymarket.markets.map((m) => m.liquidity),
          ...metrics.platforms.kalshi.markets.map((m) =>
            Math.max(m.liquidity, m.openInterest)
          )
        );

        return {
          id: group.id,
          limitlessMarkets: limitlessProcessed,
          polymarketMarkets: polymarketProcessed,
          kalshiMarkets: kalshiProcessed,
          metrics,
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
