// src/services/limitless.service.ts
import { LimitlessMarket } from "../components/types";
import { SubgraphService } from "./subgraph.service";

export class LimitlessService {
  private readonly apiUrl: string;
  private readonly subgraphService: SubgraphService;

  constructor(apiUrl: string, subgraphService: SubgraphService) {
    this.apiUrl = apiUrl;
    this.subgraphService = subgraphService;
  }

  async fetchMarketData(
    marketAddress: string
  ): Promise<LimitlessMarket | null> {
    if (marketAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    try {
      const [marketData, prices] = await Promise.all([
        fetch(`${this.apiUrl}/${marketAddress}`, {
          headers: { accept: "*/*" },
        }).then((response) => {
          if (!response.ok) {
            console.error("[LimitlessService] API error:", {
              market: marketAddress,
              status: response.status,
              statusText: response.statusText,
            });
            return null;
          }
          return response.json();
        }),
        this.subgraphService.fetchMarketPrices([marketAddress]),
      ]);

      if (!marketData) return null;

      const marketPrices = prices.get(marketAddress) || [0, 0];
      console.log(
        `[LimitlessService] Prices for market ${marketAddress}:`,
        marketPrices
      );

      return {
        ...marketData,
        prices: marketPrices,
      };
    } catch (error) {
      console.error("[LimitlessService] Error fetching market data:", error);
      return null;
    }
  }
}
