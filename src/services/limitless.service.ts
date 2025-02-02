import { LimitlessMarket } from "../components/types";

export class LimitlessService {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetchMarketData(
    marketAddress: string
  ): Promise<LimitlessMarket | null> {
    if (marketAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    try {
      console.log(
        `[LimitlessService] Fetching market data for address: ${marketAddress}`
      );

      const response = await fetch(`${this.apiUrl}/${marketAddress}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) {
        console.error("[LimitlessService] API error:", {
          market: marketAddress,
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const marketData = await response.json();

      // Log relevant market resolution data
      console.log(
        `[LimitlessService] Market ${marketAddress} resolution info:`,
        {
          status: marketData.status,
          winningOutcomeIndex: marketData.winningOutcomeIndex,
          expired: marketData.expired,
          title: marketData.title,
        }
      );

      return marketData;
    } catch (error) {
      console.error("[LimitlessService] Error fetching market data:", error);
      return null;
    }
  }
}
