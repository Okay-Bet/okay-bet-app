import { PrismaClient, Prisma } from "@prisma/client";
import { ProgressTracker } from "../utils/progressTracker";
import { LimitlessMarket, PolymarketMarket } from "../types";
import { extractKeywords } from "./matching";

export async function fetchPolymarketMarkets(
  limitlessMarkets: LimitlessMarket[],
  progress: ProgressTracker
) {
  const prisma = new PrismaClient();

  try {
    progress.addUpdate(
      "polymarket",
      "Starting Polymarket market fetch from database..."
    );

    // Extract keywords from all Limitless markets
    const marketKeywords = limitlessMarkets.flatMap((market) =>
      extractKeywords(`${market.title} ${market.description}`)
    );

    // Create a keyword search condition for Prisma
    const keywordConditions = marketKeywords.map((keyword) => ({
      OR: [
        { question: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
      ],
    }));

    // Fetch markets that match any of the keywords and are active
    const markets = await prisma.polymarketMarket.findMany({
      where: {
        AND: [{ isActive: true }, { OR: keywordConditions }],
      },
      orderBy: {
        volume: "desc",
      },
    });

    progress.addUpdate(
      "polymarket",
      `Retrieved ${markets.length} markets from database matching ${marketKeywords.length} keywords`
    );

    // Format markets to match our expected structure
    const formattedMarkets = markets.map((market) => ({
      condition_id: market.id,
      question: market.question,
      description: market.description || "",
      volume: market.volume?.toString() || "0",
      end_date_iso: market.endDate?.toISOString(),
    }));

    progress.addUpdate(
      "polymarket",
      `Formatted ${formattedMarkets.length} markets for comparison`
    );

    return formattedMarkets;
  } finally {
    await prisma.$disconnect();
  }
}
