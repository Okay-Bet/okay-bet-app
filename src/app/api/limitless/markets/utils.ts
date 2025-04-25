import type { LimitlessMarket, MarketStatus } from "@/components/types";

const FASTAPI_URL = "http://157.245.87.57:8000/api/v1/limitless";

export interface LimitlessAPIMarket {
  id: string;
  limitless_id: number;
  title: string;
  description: string | null;
  status: string;
  expiration_date: string;
  expirationTimestamp: number;
  collateralToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  // Formatted values for filtering and sorting
  liquidityFormatted: string;
  volumeFormatted: string;
  openInterestFormatted: string;
  // Metrics
  api_volume: number;
  contract_volume: number;
  volume_24h: number;
  total_trades: number;
  unique_traders: number;
  // Market data
  best_bid_price: number;
  best_bid_size: number;
  best_ask_price: number;
  best_ask_size: number;
  last_trade_price: number;
  // Additional fields
  max_spread: number;
  adjusted_midpoint: number;
  min_size: number;
  created_at: string;
  updated_at: string;
  last_checked: string;
  last_trade_time: string;
  categories: string[];
  slug: string | null;
}

export interface MarketResponse {
  status: string;
  market: LimitlessAPIMarket;
}

const mapStatus = (status: string): MarketStatus => {
  if (!status) return "CANCELLED";
  
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
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Clean up whitespace
  return withoutEntities.replace(/\s+/g, " ").trim();
};

async function fetchFastAPIMarketData(marketId: string): Promise<LimitlessAPIMarket | null> {
  try {
    const response = await fetch(`${FASTAPI_URL}/markets/${marketId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`FastAPI error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: MarketResponse = await response.json();
    return data.market;
  } catch (error) {
    console.error(`Error fetching from FastAPI:`, error);
    return null;
  }
}

function validateMarketData(market: LimitlessMarket): boolean {
  if (!market.id || !market.question) {
    return false;
  }
  return true;
}

function formatNumber(value: number | string | null | undefined, decimals: number = 6): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return (num / Math.pow(10, decimals)).toFixed(2);
}

export const transformMarket = async (marketId: string): Promise<LimitlessMarket | null> => {
  try {
    
    const fastAPIData = await fetchFastAPIMarketData(marketId);

    if (!fastAPIData) {
      console.error(`No data available for market ${marketId}`);
      return null;
    }

    const market: LimitlessMarket = {
      id: marketId,
      provider: "LIMITLESS",
      question: fastAPIData.title,
      description: cleanMarkdownText(fastAPIData.description || ""),
      status: mapStatus(fastAPIData.status),
      slug: fastAPIData.slug || "",
      expirationDate: fastAPIData.expiration_date,
      timestamps: {
        created: fastAPIData.created_at,
        updated: fastAPIData.updated_at,
        resolved: fastAPIData.status === "RESOLVED" ? fastAPIData.updated_at : undefined,
      },
      collateral: {
        address: '',
        symbol: '$',
        decimals: 18,
      },
      metrics: {
        volume: formatNumber(fastAPIData.contract_volume),
        volumeRaw: String(fastAPIData.contract_volume),
        liquidity: formatNumber(fastAPIData.volume_24h),
        liquidityRaw: String(fastAPIData.volume_24h),
        openInterest: formatNumber(fastAPIData.volume_24h),
        openInterestRaw: String(fastAPIData.volume_24h),
      },
      prices: {
        yes: { 
          bid: fastAPIData.best_bid_price || undefined,
          ask: fastAPIData.best_ask_price || undefined
        },
        no: { 
          bid: fastAPIData.best_bid_price ? (1 - fastAPIData.best_bid_price) : undefined,
          ask: fastAPIData.best_ask_price ? (1 - fastAPIData.best_ask_price) : undefined
        },
      },
      contract: {
        address: marketId,
        network: "base",
      },
      conditionId: marketId,
    };

    if (!validateMarketData(market)) {
      console.error(`Invalid market data for ${marketId}`);
      return null;
    }

    return market;

  } catch (error) {
    console.error(`Error transforming market ${marketId}:`, error);
    return null;
  }
};

export async function fetchMarketsByIds(addresses: string[]): Promise<LimitlessMarket[]> {
  
  try {
    const marketPromises = addresses.map(address => transformMarket(address));
    const markets = await Promise.all(marketPromises);
    
    const validMarkets = markets.filter((market): market is LimitlessMarket => {
      if (!market) {
        return false;
      }
      return validateMarketData(market);
    });

    return validMarkets;
  } catch (error) {
    console.error("Error fetching markets:", error);
    return [];
  }
}

export async function fetchMarketById(address: string): Promise<LimitlessMarket | null> {
  try {
    return await transformMarket(address);
  } catch (error) {
    console.error(`Error fetching market ${address}:`, error);
    return null;
  }
}