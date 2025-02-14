import { PrismaClient } from "@prisma/client";
import stringSimilarity from "string-similarity";
import { ProgressTracker } from "../utils/progressTracker";
import {
  LimitlessMarket,
  PolymarketMarket,
  DetailedComparison,
} from "../types";

const SIMILARITY_THRESHOLD = 0.8;
const DEBUG_TOP_SIMILARITIES = 5;

export function extractKeywords(text: string): string[] {
  // Clean the text
  const cleanedText = text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/https?:\/\/\S+/g, "") // Remove URLs
    .replace(/[^\w\s-]/g, " ") // Replace punctuation with space
    .toLowerCase()
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Split into words
  const words = cleanedText.split(" ");

  // Filter out common words and short words
  const stopWords = new Set([
    "will",
    "what",
    "when",
    "where",
    "who",
    "how",
    "the",
    "be",
    "to",
    "of",
    "and",
    "a",
    "in",
    "that",
    "have",
    "it",
    "for",
    "not",
    "on",
    "with",
    "as",
    "at",
    "by",
    "from",
    "or",
    "an",
    "if",
    "between",
    "during",
    "through",
    "after",
    "before",
    "yes",
    "no",
    "maybe",
    "resolved",
    "resolves",
    "resolve",
    "market",
    "markets",
    "post",
    "posts",
    "posted",
    "make",
    "makes",
    "made",
  ]);

  // Get unique meaningful words
  const uniqueWords = new Set(
    words.filter(
      (word) => word.length > 2 && !stopWords.has(word) && !word.match(/^\d+$/)
    )
  );

  // Prioritize certain keywords if they exist
  const priorityKeywords = [
    "trump",
    "biden",
    "elon",
    "musk",
    "tweet",
    "twitter",
  ];
  const keywords = Array.from(uniqueWords)
    .filter((word) => {
      // Keep numbers if they're part of a word (e.g., "2024")
      if (word.match(/\d{4}/)) return true;
      return !word.match(/\d/);
    })
    .sort((a, b) => {
      const aIsPriority = priorityKeywords.includes(a);
      const bIsPriority = priorityKeywords.includes(b);
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });

  return keywords.slice(0, 3); // Return top 3 keywords
}

function calculateSimilarity(
  limitlessMarket: LimitlessMarket,
  polyMarket: PolymarketMarket
): number {
  const cleanText = (text: string) => {
    return (
      text
        .toLowerCase()
        // Standardize number ranges
        .replace(/(\d+)\s*-\s*(\d+)/g, "$1to$2")
        // Remove common words
        .replace(/will|what|how|many|the|a|an|be|to|in|on|at|of|for|by/g, "")
        .replace(/\?/g, "") // Remove question marks
        .replace(/[^\w\s]/g, "") // Remove other punctuation
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
    );
  };

  const limitlessText = cleanText(
    `${limitlessMarket.title} ${limitlessMarket.description}`
  );
  const polyText = cleanText(
    `${polyMarket.question} ${polyMarket.description || ""}`
  );

  const similarity = stringSimilarity.compareTwoStrings(
    limitlessText,
    polyText
  );

  if (similarity > 0.5) {
    console.log("\nPotential Match Found:");
    console.log(`Similarity Score: ${(similarity * 100).toFixed(1)}%`);
    console.log(`Limitless: ${limitlessMarket.title}`);
    console.log(`Polymarket: ${polyMarket.question}`);
    console.log(`Limitless Volume: ${limitlessMarket.volumeFormatted} USDC`);
    console.log(`Cleaned Limitless: ${limitlessText}`);
    console.log(`Cleaned Poly: ${polyText}`);
    console.log("-".repeat(80));
  }

  return similarity;
}

export async function matchMarkets(
  limitlessMarkets: LimitlessMarket[],
  polymarketMarkets: PolymarketMarket[],
  progress: ProgressTracker,
  threshold: number = SIMILARITY_THRESHOLD
) {
  const prisma = new PrismaClient();
  const matches: any[] = [];
  const topSimilarities: DetailedComparison[] = [];

  try {
    let comparisonCount = 0;
    const totalComparisons = limitlessMarkets.length * polymarketMarkets.length;

    progress.addUpdate("matching", "Starting similarity comparison", {
      limitlessMarketsCount: limitlessMarkets.length,
      polymarketsCount: polymarketMarkets.length,
      threshold,
    });

    for (const limitlessMarket of limitlessMarkets) {
      const marketComparisons: DetailedComparison[] = [];

      for (const polyMarket of polymarketMarkets) {
        comparisonCount++;
        const similarity = calculateSimilarity(limitlessMarket, polyMarket);

        marketComparisons.push({
          limitlessMarket: {
            title: limitlessMarket.title,
            description: limitlessMarket.description,
            volume: limitlessMarket.volumeFormatted,
            address: limitlessMarket.address,
            collateralSymbol: limitlessMarket.collateralToken.symbol,
          },
          polyMarket: {
            question: polyMarket.question,
            description: polyMarket.description,
            condition_id: polyMarket.condition_id,
          },
          similarity,
        });

        if (similarity >= threshold) {
          progress.addUpdate("match_found", "Found matching markets", {
            limitlessTitle: limitlessMarket.title,
            polymarketTitle: polyMarket.question,
            similarity,
            limitlessVolume: limitlessMarket.volumeFormatted,
            keywords: extractKeywords(
              `${limitlessMarket.title} ${limitlessMarket.description}`
            ),
          });

          try {
            const groupedMarket = await prisma.groupedMarket.create({
              data: {
                title: limitlessMarket.title,
                description: limitlessMarket.description,
                limitlessId: limitlessMarket.address,
                polymarketId: polyMarket.condition_id,
                similarity: similarity,
                endDate: new Date(limitlessMarket.expirationDate),
              },
            });
            matches.push(groupedMarket);
          } catch (error) {
            console.error("Error creating grouped market:", error);
            progress.addUpdate("error", "Failed to create grouped market", {
              limitlessId: limitlessMarket.address,
              polymarketId: polyMarket.condition_id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Progress update every 100 comparisons
        if (comparisonCount % 100 === 0) {
          progress.addUpdate("progress", "Comparison progress", {
            completed: comparisonCount,
            total: totalComparisons,
            percentComplete: (
              (comparisonCount / totalComparisons) *
              100
            ).toFixed(1),
          });
        }
      }

      // Get top matches for this market
      const bestComparisons = marketComparisons
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, DEBUG_TOP_SIMILARITIES);

      progress.addUpdate(
        "market_analysis",
        `Top matches for Limitless market: ${limitlessMarket.title}`,
        {
          marketDetails: {
            title: limitlessMarket.title,
            volume: limitlessMarket.volumeFormatted,
            keywords: extractKeywords(
              `${limitlessMarket.title} ${limitlessMarket.description}`
            ),
          },
          topMatches: bestComparisons.map((match) => ({
            polymarketTitle: match.polyMarket.question,
            similarity: match.similarity,
          })),
        }
      );

      topSimilarities.push(...bestComparisons);
    }

    return {
      matches,
      topSimilarities: topSimilarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, DEBUG_TOP_SIMILARITIES * limitlessMarkets.length),
    };
  } finally {
    await prisma.$disconnect();
  }
}
