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

      console.log(`[LimitlessService] Market data for ${marketAddress}:`, {
        title: marketData.title,
        status: marketData.status,
        winningOutcomeIndex: marketData.winningOutcomeIndex,
        isResolved: marketData.status.toUpperCase() === "RESOLVED",
      });

      return marketData;
    } catch (error) {
      console.error("[LimitlessService] Error fetching market data:", error);
      return null;
    }
  }
}
