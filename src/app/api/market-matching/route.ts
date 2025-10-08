import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ProgressTracker } from "./utils/progressTracker";
import { fetchQualifyingLimitlessMarkets } from "./services/limitless";
import { fetchPolymarketMarkets } from "./services/polymarket";
import * as MatchingService from "./services/matching";

export const dynamic = 'force-dynamic';

interface PolymarketMarket {
  condition_id: string;
  question: string;
  description: string;
  volume: string;
  end_date_iso: string;
}

interface Match {
  limitlessId: string;
  polymarketId: string;
  similarity: number;
  endDate: string;
}

interface MatchingStats {
  activeMatches: number;
  averageSimilarity: string;
  matchesWithinWeek: number;
}

const SIMILARITY_THRESHOLD = 0.8;
const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const progress = new ProgressTracker();

  try {
    const searchParams = request.nextUrl.searchParams;
    const threshold = parseFloat(
      searchParams.get("threshold") || SIMILARITY_THRESHOLD.toString()
    );

    progress.addUpdate(
      "start",
      `Starting market matching process with threshold ${threshold}`
    );

    // Verify database connection and active markets
    const activeMarketsCount = await prisma.polymarketMarket.count({
      where: { isActive: true },
    });

    if (activeMarketsCount === 0) {
      progress.addUpdate(
        "warning",
        "No active Polymarket markets found in database. Please run the population script first."
      );
      return handleNoPolymarkets(progress, []);
    }

    progress.addUpdate(
      "database",
      `Found ${activeMarketsCount} active Polymarket markets in database`
    );

    // Fetch Limitless markets
    const limitlessMarkets = await fetchQualifyingLimitlessMarkets(progress);

    if (limitlessMarkets.length === 0) {
      return handleNoLimitlessMarkets(progress);
    }

    // Fetch relevant Polymarket markets from database
    const polymarketMarkets = await fetchPolymarketMarkets(
      limitlessMarkets,
      progress
    );

    if (polymarketMarkets.length === 0) {
      return handleNoPolymarkets(progress, limitlessMarkets);
    }

    // Filter out any markets with undefined end_date_iso
    const validPolymarketMarkets = polymarketMarkets.filter(
      (market): market is PolymarketMarket =>
        typeof market.end_date_iso === "string" &&
        typeof market.condition_id === "string" &&
        typeof market.question === "string" &&
        typeof market.description === "string" &&
        typeof market.volume === "string"
    );

    // Clear existing matches for these Limitless markets
    await prisma.groupedMarket.deleteMany({
      where: {
        limitlessMarkets: {
          some: {
            marketId: {
              in: limitlessMarkets.map((m) => m.address),
            },
          },
        },
      },
    });

    progress.addUpdate(
      "matching",
      `Starting matching process with ${limitlessMarkets.length} Limitless markets and ${validPolymarketMarkets.length} Polymarket markets`
    );

    // Perform matching with validated markets
    const { matches, topSimilarities } = await MatchingService.matchMarkets(
      limitlessMarkets,
      validPolymarketMarkets,
      progress,
      threshold
    );

    // Get detailed stats for response
    const matchStats = await getMatchingStats(matches);

    return NextResponse.json({
      success: true,
      progress: progress.getUpdates(),
      matches,
      totalMatches: matches.length,
      stats: {
        limitlessMarkets: limitlessMarkets.length,
        polymarketMarkets: polymarketMarkets.length,
        similarityThreshold: threshold,
        ...matchStats,
      },
      qualifyingLimitlessMarkets: limitlessMarkets.map((m) => ({
        title: m.title,
        volume: m.volumeFormatted,
        keywords: MatchingService.extractKeywords(
          `${m.title} ${m.description}`
        ),
      })),
      topSimilarities,
    });
  } catch (error) {
    return handleError(error, progress);
  } finally {
    await prisma.$disconnect();
  }
}

async function getMatchingStats(matches: Match[]): Promise<MatchingStats> {
  const now = new Date();

  const activeMatches = matches.filter(
    (m) => m.endDate && new Date(m.endDate) > now
  );

  const avgSimilarity =
    matches.length > 0
      ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
      : 0;

  return {
    activeMatches: activeMatches.length,
    averageSimilarity: avgSimilarity.toFixed(3),
    matchesWithinWeek: matches.filter(
      (m) =>
        m.endDate &&
        new Date(m.endDate).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length,
  };
}

function handleNoLimitlessMarkets(progress: ProgressTracker) {
  progress.addUpdate("warning", "No qualifying Limitless markets found");
  return NextResponse.json({
    success: true,
    progress: progress.getUpdates(),
    matches: [],
    totalMatches: 0,
    stats: {
      limitlessMarkets: 0,
      polymarketMarkets: 0,
      totalComparisons: 0,
      similarityThreshold: SIMILARITY_THRESHOLD,
    },
  });
}

function handleNoPolymarkets(
  progress: ProgressTracker,
  limitlessMarkets: Array<any>
) {
  progress.addUpdate("warning", "No matching Polymarket markets found");
  return NextResponse.json({
    success: true,
    progress: progress.getUpdates(),
    matches: [],
    totalMatches: 0,
    stats: {
      limitlessMarkets: limitlessMarkets.length,
      polymarketMarkets: 0,
      totalComparisons: 0,
      similarityThreshold: SIMILARITY_THRESHOLD,
    },
    qualifyingLimitlessMarkets: limitlessMarkets.map((m) => ({
      title: m.title,
      volume: m.volumeFormatted,
      keywords: MatchingService.extractKeywords(`${m.title} ${m.description}`),
    })),
  });
}

function handleError(error: unknown, progress: ProgressTracker) {
  const errorMessage =
    error instanceof Error ? error.message : "Internal server error";

  progress.addUpdate("error", errorMessage);
  console.error("Market matching error:", error);

  return NextResponse.json(
    {
      error: errorMessage,
      progress: progress.getUpdates(),
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}
