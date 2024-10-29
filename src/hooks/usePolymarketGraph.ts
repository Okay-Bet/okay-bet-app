// hooks/usePolymarketGraph.ts
import { useState, useEffect } from "react";
import { Market, MarketParams } from "../components/types/polymarket";

const POSITIONS_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/positions-subgraph/0.0.7/gn";

const MARKETS_QUERY = `
query GetMarkets($limit: Int!) {
  conditions(
    first: $limit
    orderBy: id
    orderDirection: desc
  ) {
    id
    payouts
  }
  tokenIdConditions(
    first: $limit
    orderBy: id
    orderDirection: desc
  ) {
    id
    condition {
      id
    }
    outcomeIndex
  }
  userBalances(
    first: 1000
    orderBy: balance
    orderDirection: desc
  ) {
    id
    user
    balance
    asset {
      id
      condition {
        id
      }
    }
  }
}
`;

export const usePolymarketGraph = (params: MarketParams) => {
  const [marketData, setMarketData] = useState<Market[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch(POSITIONS_SUBGRAPH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: MARKETS_QUERY,
            variables: {
              limit: params.limit || 50,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();

        if (json.errors) {
          console.error("GraphQL Errors:", json.errors);
          throw new Error(json.errors[0].message);
        }

        const { conditions, tokenIdConditions, userBalances } = json.data;

        // Calculate total liquidity per condition from user balances
        const liquidityMap = new Map();
        userBalances?.forEach((balance: any) => {
          const conditionId = balance.asset.condition.id;
          const currentLiquidity = liquidityMap.get(conditionId) || 0;
          liquidityMap.set(
            conditionId,
            currentLiquidity + parseFloat(balance.balance || "0")
          );
        });

        // Create outcome counts map
        const outcomeCountMap = new Map();
        tokenIdConditions?.forEach((token: any) => {
          const conditionId = token.condition.id;
          const outcomes = outcomeCountMap.get(conditionId) || new Set();
          outcomes.add(token.outcomeIndex);
          outcomeCountMap.set(conditionId, outcomes);
        });

        // Process conditions into markets
        const markets = conditions
          ?.map((condition: any) => {
            const liquidity = liquidityMap.get(condition.id) || 0;
            const outcomes = Array.from(
              outcomeCountMap.get(condition.id) || []
            );

            // Skip markets with insufficient liquidity
            if (liquidity < (params.liquidity_num_min || 0)) {
              return null;
            }

            return {
              id: condition.id,
              question: `Market ${condition.id.slice(0, 8)}...`,
              liquidity_num: liquidity,
              volume_num: 0,
              condition_id: condition.id,
              active: !condition.payouts,
              closed: !!condition.payouts,
              enableOrderBook: true,
              bestBid: outcomes.length > 0 ? 0.5 : undefined, // Placeholder YES price
              bestAsk: outcomes.length > 0 ? 0.5 : undefined, // Placeholder NO price
              end_date_iso: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(), // Placeholder
              outcomes: outcomes.map((index) => ({
                id: `${condition.id}-${index}`,
                index: index.toString(),
                complement: `Outcome ${index}`,
              })),
            };
          })
          .filter(Boolean) // Remove null entries
          .filter((market) => (params.active ? market.active : true)) // Filter active markets if requested
          .sort((a, b) => b.liquidity_num - a.liquidity_num) // Sort by liquidity
          .slice(0, params.limit || 50);

        console.log("Markets found:", markets?.length);
        console.log(
          "Markets by liquidity:",
          markets?.map((m) => ({
            id: m.id,
            liquidity: m.liquidity_num,
            outcomes: m.outcomes.length,
            active: m.active,
          }))
        );

        setMarketData(markets);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching market data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch market data"
        );
        setLoading(false);
        setMarketData(null);
      }
    };

    fetchMarketData();
  }, [params]);

  return { marketData, loading, error };
};
