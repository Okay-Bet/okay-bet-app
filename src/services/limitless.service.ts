// services/limitless.service.ts
import { LimitlessMarket } from "../components/types";

export class LimitlessService {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetchMarketData(marketAddress: string): Promise<LimitlessMarket | null> {
    if (marketAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/${marketAddress}`, {
        headers: { accept: "*/*" },
      });

      if (!response.ok) {
        console.error("Limitless API error:", response.status, response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching market data:", error);
      return null;
    }
  }
}