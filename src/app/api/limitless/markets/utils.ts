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

const cleanMarkdownText = (text: string): string => {
  if (!text) return "";

  // Remove HTML tags
  const withoutTags = text.replace(/<[^>]*>/g, "");

  // Replace HTML entities
  const withoutEntities = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Clean up multiple spaces and trim
  return withoutEntities.replace(/\s+/g, " ").trim();
};

export const transformMarket = (
  market: LimitlessAPIMarket
): LimitlessMarket => {
  // Parse the raw values and convert from string
  const volumeRaw = market.volume ? parseFloat(market.volume) : 0;
  const openInterestRaw = market.openInterest ? parseFloat(market.openInterest) : 0;

  // Format with proper scaling (values are in USDC with 6 decimals)
  const volumeFormatted = (volumeRaw / 1e6).toString();
  const openInterestFormatted = (openInterestRaw / 1e6).toString();

  return {
    id: market.address,
    provider: "LIMITLESS" as const,
    question: market.title,
    description: cleanMarkdownText(market.description),
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
      volume: volumeFormatted,
      volumeRaw: volumeRaw.toString(),
      openInterest: openInterestFormatted,
      openInterestRaw: openInterestRaw.toString(),
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
    const response = await fetch(`${LIMITLESS_API_URL}/markets/${address}`);

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
