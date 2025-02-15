import type { LimitlessMarket, MarketStatus } from "@/components/types";

const LIMITLESS_API_URL = "https://api.limitless.exchange";


export interface LimitlessAPIMarket {
  address: string;
  conditionId: string;
  title: string;
  description: string;
  collateralToken: {
    address: string;
    decimals: number;
    symbol: string;
  };
  expirationDate: string;
  expirationTimestamp: number;
  createdAt: string;
  category: string;
  status: string;
  creator: {
    name: string;
    imageURI: string;
    link: string;
  };
  tags: string[];
  openInterest: string;
  openInterestFormatted: string;
  volume: string;
  volumeFormatted: string;
  liquidity: string;
  liquidityFormatted: string;
}

const mapStatus = (status: string): MarketStatus => {
    switch (status.toUpperCase()) {
      case "FUNDED":
        return "ACTIVE";
      case "RESOLVED":
        return "RESOLVED";
      default:
        return "CANCELLED";
    }
  };

export const transformMarket = (market: LimitlessAPIMarket): LimitlessMarket => {
    return {
      id: market.address,
      provider: "LIMITLESS" as const,
      question: market.title,
      description: market.description,
      status: mapStatus(market.status),
      expirationDate: market.expirationDate,
      timestamps: {
        created: market.createdAt,
      },
      collateral: {
        address: market.collateralToken.address,
        symbol: market.collateralToken.symbol,
        decimals: market.collateralToken.decimals,
      },
      metrics: {
        volume: market.volumeFormatted,
        volumeRaw: market.volume,
        liquidity: market.liquidityFormatted,
        liquidityRaw: market.liquidity,
      },
      prices: {
        yes: {},
        no: {},
      },
      contract: {
        address: market.address,
        network: "base",
      },
      conditionId: market.conditionId,
    };
  };

export async function fetchMarketById(
  address: string
): Promise<LimitlessMarket | null> {
  try {
    const response = await fetch(
      `${LIMITLESS_API_URL}/markets/${address}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Limitless API error: ${response.status} ${response.statusText}`
      );
    }

    const market: LimitlessAPIMarket = await response.json();
    return transformMarket(market);
  } catch (error) {
    console.error(`Error fetching market ${address}:`, error);
    return null;
  }
}

export async function fetchMarketsByIds(
    addresses: string[]
  ): Promise<LimitlessMarket[]> {
    const markets = await Promise.all(
      addresses.map((address) => fetchMarketById(address))
    );
  
    return markets.filter((market): market is LimitlessMarket => market !== null);
  }