import { ProgressTracker } from "../utils/progressTracker";
import { LimitlessMarket, PolymarketMarket } from "../types";
import { extractKeywords } from "./matching";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  description: string;
  volume: string;
  endDate: string;
  active: boolean;
  outcomes: string;
}

async function fetchAllActiveMarkets(): Promise<GammaMarket[]> {
  try {
    // Simple request first to test the API
    const response = await fetch(`${GAMMA_API_URL}/markets`);

    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${response.statusText}`);
      // Log the response body for debugging
      const errorText = await response.text();
      console.error("Response body:", errorText);
      throw new Error(`Failed to fetch markets: ${response.status}`);
    }

    const markets = await response.json();
    console.log("Sample of first market:", JSON.stringify(markets[0], null, 2));

    return markets.filter((market: any) => market.active === true);
  } catch (error) {
    console.error("Detailed error fetching from Gamma API:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return [];
  }
}

export async function fetchPolymarketMarkets(
  limitlessMarkets: LimitlessMarket[],
  progress: ProgressTracker
) {
  progress.addUpdate(
    "polymarket",
    "Starting Polymarket market fetch from Gamma API..."
  );

  // Fetch all active markets
  const markets = await fetchAllActiveMarkets();

  if (!markets || markets.length === 0) {
    progress.addUpdate("error", "Failed to fetch markets from Gamma API");
    return [];
  }

  progress.addUpdate(
    "polymarket",
    `Retrieved ${markets.length} markets from Gamma API. First market sample:`,
    { sampleMarket: markets[0] }
  );

  // Format markets to match our expected structure
  const formattedMarkets = markets.map((market) => ({
    condition_id: market.conditionId,
    question: market.question,
    description: market.description || "",
    volume: market.volume || "0",
    end_date_iso: market.endDate,
  }));

  progress.addUpdate(
    "polymarket",
    `Formatted ${formattedMarkets.length} markets`
  );

  return formattedMarkets;
}
