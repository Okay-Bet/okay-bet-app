import { useState, useEffect } from "react";
import { Market, MarketParams } from "../components/types/polymarket";

const POSITIONS_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/positions-subgraph/0.0.7/gn";
const GAMMA_API_URL = "https://gamma-api.polymarket.com";

const MARKETS_QUERY = `
query GetMarkets($limit: Int!) {
  conditions(
    first: $limit
    orderBy: id
    orderDirection: desc
    where: { payouts: null }
  ) {
    id
    payouts
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
        // First, get conditions from subgraph
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        const { conditions } = json.data;

        // Get additional market data from Gamma API
        const gammaResponse = await fetch(
          `${GAMMA_API_URL}/markets?limit=${params.limit || 50}`
        );
        if (!gammaResponse.ok) {
          throw new Error(`HTTP error! status: ${gammaResponse.status}`);
        }
        const gammaData = await gammaResponse.json();

        // Convert gamma data object to array and create map
        const gammaDataArray = Object.values(gammaData);
        const gammaDataMap = new Map(
          gammaDataArray.map((market: any) => [market.conditionId, market])
        );

        // Process conditions into markets
        const markets = conditions
          ?.map((condition: any) => {
            const gammaMarket = gammaDataMap.get(condition.id);

            if (!gammaMarket) {
              return {
                id: condition.id,
                question: `Market ${condition.id.slice(0, 8)}...`,
                liquidity_num: 0,
                volume_num: 0,
                condition_id: condition.id,
                active: !condition.payouts,
                closed: !!condition.payouts,
                enableOrderBook: true,
                bestBid: 0,
                bestAsk: 0,
                outcomes: [],
              };
            }

            // Skip if doesn't meet minimum requirements
            if (
              params.liquidity_num_min &&
              gammaMarket.liquidityNum < params.liquidity_num_min
            ) {
              return null;
            }

            if (
              params.volume_num_min &&
              gammaMarket.volumeNum < params.volume_num_min
            ) {
              return null;
            }

            // Return enriched market data
            return {
              id: condition.id,
              question: gammaMarket.question,
              liquidity_num: Number(gammaMarket.liquidityNum || 0),
              volume_num: Number(gammaMarket.volumeNum || 0),
              condition_id: condition.id,
              active: !condition.payouts,
              closed: !!condition.payouts,
              enableOrderBook: true,
              bestBid: Number(gammaMarket.bestBid || 0),
              bestAsk: Number(gammaMarket.bestAsk || 0),
              end_date_iso: gammaMarket.endDateIso,
              outcomes: (gammaMarket.outcomes || []).map((outcome: any) => ({
                id: outcome.id || "",
                index: outcome.title || "",
                complement: outcome.title || "",
              })),
            };
          })
          .filter(Boolean)
          .sort((a: Market, b: Market) => b.volume_num - a.volume_num)
          .slice(0, params.limit || 50);

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
