import { PrismaClient } from "@prisma/client";
import stringSimilarity from "string-similarity";
import { ProgressTracker } from "../utils/progressTracker";
import {
  LimitlessMarket,
  PolymarketMarket,
  DetailedComparison,
} from "../types";

const SIMILARITY_THRESHOLD = 0.5;
const DEBUG_TOP_SIMILARITIES = 5;

export const extractKeywords = (text: string): string[] => {
  // Clean the text
  const cleanedText = text
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  // Split into words
  const words = cleanedText.split(" ");

  // Enhanced stop words list
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
    "beat",
    "vs",
    "versus",
    "fight",
    "win",
    "lose",
    "at",
    "in",
    "on",
  ]);

  // Special keywords that should be prioritized
  const priorityTerms = new Set([
    "ufc",
    "nfl",
    "nba",
    "mlb",
    "fifa",
    "trump",
    "biden",
    "election",
    // Add other sports leagues, common event types, etc.
  ]);

  // Get names (words starting with capital letters in original text)
  const names = text
    .split(/\s+/)
    .filter((word) => /^[A-Z][a-zA-Z]*$/.test(word) && word.length > 2);

  // Create a set of normalized names
  const nameSet = new Set(names.map((name) => name.toLowerCase()));

  // Filter and prioritize words
  const keywords = words
    .filter((word) => {
      if (word.length <= 2) return false;
      if (stopWords.has(word)) return false;
      if (!word.match(/^[a-z0-9]+$/)) return false;
      return true;
    })
    .sort((a, b) => {
      // Prioritize names and special terms
      const aIsName = nameSet.has(a);
      const bIsName = nameSet.has(b);
      const aIsPriority = priorityTerms.has(a);
      const bIsPriority = priorityTerms.has(b);

      if (aIsName && !bIsName) return -1;
      if (!aIsName && bIsName) return 1;
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });

  return [
    ...new Set([...names.map((n) => n.toLowerCase()), ...keywords]),
  ].slice(0, 5);
};

export const calculateSimilarity = (
  limitlessMarket: LimitlessMarket,
  polyMarket: PolymarketMarket
): number => {
  // Basic cleanup to normalize text
  const cleanText = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  };

  // Get original texts
  const limitlessText = cleanText(limitlessMarket.title);
  const polyText = cleanText(polyMarket.question);

  // Extract names (words starting with capital letters)
  const getNames = (text: string) => {
    const words = text.split(" ");
    return words.filter((word) => /^[A-Z][a-zA-Z]*$/.test(word));
  };

  const limitlessNames = getNames(limitlessMarket.title);
  const polyNames = getNames(polyMarket.question);

  // If we have matching names, boost similarity significantly
  const hasMatchingNames = limitlessNames.some((name) =>
    polyNames.includes(name)
  );

  // Calculate base similarity
  const baseSimilarity = stringSimilarity.compareTwoStrings(
    limitlessText,
    polyText
  );

  // Boost similarity if names match
  let finalSimilarity = baseSimilarity;
  if (hasMatchingNames) {
    finalSimilarity += 0.4; // Significant boost for matching names
  }

  // Log potential matches for debugging
  if (finalSimilarity > 0.1) {
    console.log("\nPotential Match Found:");
    console.log(
      `Final Similarity Score: ${(finalSimilarity * 100).toFixed(1)}%`
    );
    console.log(`Base Similarity: ${(baseSimilarity * 100).toFixed(1)}%`);
    console.log(`Has Matching Names: ${hasMatchingNames}`);
    console.log(`Limitless: ${limitlessMarket.title}`);
    console.log(`Polymarket: ${polyMarket.question}`);
    console.log(`Limitless Names: ${limitlessNames.join(", ")}`);
    console.log(`Poly Names: ${polyNames.join(", ")}`);
    console.log("-".repeat(80));
  }

  return Math.min(finalSimilarity, 1);
};

export const matchMarkets = async (
  limitlessMarkets: LimitlessMarket[],
  polymarketMarkets: PolymarketMarket[],
  progress: ProgressTracker,
  threshold: number = SIMILARITY_THRESHOLD
) => {
  const prisma = new PrismaClient();
  const matches: any[] = [];
  const topSimilarities: DetailedComparison[] = [];

  try {
    // Clear existing grouped markets
    await prisma.groupedMarket.deleteMany({});

    progress.addUpdate("matching", "Starting market matching process", {
      limitlessCount: limitlessMarkets.length,
      polymarketsCount: polymarketMarkets.length,
      threshold,
    });

    for (const limitlessMarket of limitlessMarkets) {
      // Store all comparisons for this limitless market
      const marketComparisons: Array<{
        polyMarket: PolymarketMarket;
        similarity: number;
      }> = [];

      for (const polyMarket of polymarketMarkets) {
        const similarity = calculateSimilarity(limitlessMarket, polyMarket);

        if (similarity >= threshold) {
          marketComparisons.push({
            polyMarket,
            similarity,
          });
        }
      }

      // Sort and take only top 2 matches for this limitless market
      const topMatches = marketComparisons
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 2);

      // Create grouped markets only for top matches
      for (const match of topMatches) {
        try {
          const groupedMarket = await prisma.groupedMarket.create({
            data: {
              limitlessMarkets: {
                create: {
                  marketId: limitlessMarket.address,
                  similarity: match.similarity,
                },
              },
              polymarketMarkets: {
                create: {
                  marketId: match.polyMarket.condition_id,
                  similarity: match.similarity,
                },
              },
            },
          });

          matches.push(groupedMarket);

          progress.addUpdate("match_found", "Found matching market", {
            limitlessTitle: limitlessMarket.title,
            polymarketTitle: match.polyMarket.question,
            similarity: match.similarity,
            rank: topMatches.indexOf(match) + 1,
          });
        } catch (error) {
          console.error("Error creating grouped market:", error);
          progress.addUpdate("error", "Failed to create grouped market", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Add to topSimilarities for response
      topSimilarities.push(
        ...topMatches.map((match) => ({
          limitlessMarket: {
            title: limitlessMarket.title,
            description: limitlessMarket.description,
            volume: limitlessMarket.volumeFormatted,
            address: limitlessMarket.address,
            collateralSymbol: limitlessMarket.collateralToken.symbol,
          },
          polyMarket: {
            question: match.polyMarket.question,
            description: match.polyMarket.description,
            condition_id: match.polyMarket.condition_id,
          },
          similarity: match.similarity,
        }))
      );
    }

    return {
      matches,
      topSimilarities: topSimilarities.sort(
        (a, b) => b.similarity - a.similarity
      ),
    };
  } finally {
    await prisma.$disconnect();
  }
};
