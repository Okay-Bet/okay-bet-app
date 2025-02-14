import { NextResponse } from "next/server";
import { ProgressTracker } from "./utils/progressTracker";
import { fetchQualifyingLimitlessMarkets } from "./services/limitless";
import { fetchPolymarketMarkets } from "./services/polymarket";
import { matchMarkets, extractKeywords } from "./services/matching";

const SIMILARITY_THRESHOLD = 0.8;

export async function POST(request: Request) {
  const progress = new ProgressTracker();

  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(
      searchParams.get("threshold") || SIMILARITY_THRESHOLD.toString()
    );

    progress.addUpdate(
      "start",
      `Starting market matching process with threshold ${threshold}`
    );

    // Fetch markets from both sources
    const limitlessMarkets = await fetchQualifyingLimitlessMarkets(progress);

    if (limitlessMarkets.length === 0) {
      return handleNoLimitlessMarkets(progress);
    }

    const polymarketMarkets = await fetchPolymarketMarkets(
      limitlessMarkets,
      progress
    );

    if (polymarketMarkets.length === 0) {
      return handleNoPolymarkets(progress, limitlessMarkets);
    }

    // Perform matching
    const { matches, topSimilarities } = await matchMarkets(
      limitlessMarkets,
      polymarketMarkets,
      progress,
      threshold
    );

    return NextResponse.json({
      success: true,
      progress: progress.getUpdates(),
      matches,
      totalMatches: matches.length,
      stats: {
        limitlessMarkets: limitlessMarkets.length,
        polymarketMarkets: polymarketMarkets.length,
        similarityThreshold: threshold,
      },
      qualifyingLimitlessMarkets: limitlessMarkets.map((m) => ({
        title: m.title,
        volume: m.volumeFormatted,
        keywords: extractKeywords(`${m.title} ${m.description}`),
      })),
      topSimilarities,
    });
  } catch (error) {
    return handleError(error, progress);
  }
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
  limitlessMarkets: any[]
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
      keywords: extractKeywords(`${m.title} ${m.description}`),
    })),
  });
}

function handleError(error: any, progress: ProgressTracker) {
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
