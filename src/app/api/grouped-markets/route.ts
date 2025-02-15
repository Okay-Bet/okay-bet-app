import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  GroupedMarketsResponse,
  GroupedMarketIds,
} from "@/components/types/market";

export async function GET() {
  try {
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

      acc[market.limitlessId].polymarketMatches.push({
        id: market.polymarketId!,
        similarity: market.similarity,
      });

      return acc;
    }, {} as Record<string, GroupedMarketIds>);

    const response: GroupedMarketsResponse = {
      success: true,
      data: Object.values(groupedByLimitless),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching grouped markets:", error);

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: "Failed to fetch grouped markets",
      },
      { status: 500 }
    );
  }
}
