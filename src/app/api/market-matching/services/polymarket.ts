import { ProgressTracker } from "../utils/progressTracker";
import { LimitlessMarket, PolymarketMarket } from "../types";
import { extractKeywords } from "./matching";

const POSITIONS_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/positions-subgraph/0.0.7/gn";
const GAMMA_API_URL = "https://gamma-api.polymarket.com"; // Added missing constant

interface MarketData {
  id: string;
  condition: string;
  outcomeIndex: string;
}

interface SubgraphResponse {
  marketData: MarketData[];
}

async function queryPolymarketSubgraph(): Promise<SubgraphResponse | null> {
  const query = `{
        marketData(
            first: 1000
            orderBy: id
            orderDirection: desc
        ) {
            id
            condition
            outcomeIndex
        }
    }`;

  try {
    const response = await fetch(POSITIONS_SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    return json.data;
  } catch (error) {
    console.error("Error querying subgraph:", error);
    return null;
  }
}

async function fetchMarketDetails(conditionId: string): Promise<any> {
  try {
    const response = await fetch(`${GAMMA_API_URL}/markets/${conditionId}`);
    if (!response.ok) {
      console.error(
        `Failed to fetch market details for condition ${conditionId}`
      );
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching market details: ${error}`);
    return null;
  }
}

export async function fetchPolymarketMarkets(
  limitlessMarkets: LimitlessMarket[],
  progress: ProgressTracker
) {
  progress.addUpdate(
    "polymarket",
    "Starting Polymarket market fetch from subgraph..."
  );

  // First get all market data from subgraph
  const result = await queryPolymarketSubgraph();
  if (!result?.marketData) {
    progress.addUpdate("error", "Failed to fetch market data from subgraph");
    return [];
  }

  progress.addUpdate(
    "polymarket",
    `Retrieved ${result.marketData.length} markets from subgraph`
  );

  // Get unique condition IDs
  const uniqueConditions = new Set<string>(
    result.marketData.map((m: MarketData) => m.condition)
  );

  progress.addUpdate(
    "polymarket",
    `Found ${uniqueConditions.size} unique conditions`
  );

  const allMarkets = new Set<string>();

  // Fetch market details for each condition
  for (const conditionId of uniqueConditions) {
    const marketDetails = await fetchMarketDetails(conditionId);
    if (marketDetails) {
      const formattedMarket = {
        condition_id: conditionId,
        question: marketDetails.question || "",
        description: marketDetails.description || "",
        volume: marketDetails.volume || "0",
        end_date_iso: marketDetails.end_date_iso || new Date().toISOString(),
      };
      allMarkets.add(JSON.stringify(formattedMarket));
    }

    // Add delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Convert Set back to array and parse JSON
  const uniqueMarkets = Array.from(allMarkets).map((m) =>
    JSON.parse(m as string)
  );

  progress.addUpdate("polymarket", "Markets retrieved", {
    totalMarketsFound: uniqueMarkets.length,
    sampleMarkets: uniqueMarkets.slice(0, 5).map((m) => ({
      question: m.question,
      condition_id: m.condition_id,
    })),
  });

  return uniqueMarkets;
}
