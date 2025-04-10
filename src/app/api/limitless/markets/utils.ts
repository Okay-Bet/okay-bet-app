import type { LimitlessMarket, MarketStatus } from "@/components/types";

const FASTAPI_URL = "http://157.245.87.57:8000/api/v1/limitless";

export interface FastAPIMarket {
  id: string;
  limitless_id: number;
  title: string;
  description: string | null;
  status: string;
  expiration_date: string;
  api_volume: number;
  contract_volume: number;
  volume_24h: number;
  total_trades: number;
  unique_traders: number;
  collateral_token_symbol: string;
  collateral_token_address: string;
  collateral_token_decimals: number;
  categories: string[];
  created_at: string;
  updated_at: string;
  last_checked: string;
  last_trade_time: string;
  best_bid_price: number;
  best_bid_size: number;
  best_ask_price: number;
  best_ask_size: number;
  last_trade_price: number;
  max_spread: number;
  adjusted_midpoint: number;
  min_size: number;
  slug: string | null;
}

export interface MarketResponse {
  status: string;
  market: FastAPIMarket;
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

async function fetchFastAPIMarketData(marketId: string): Promise<FastAPIMarket | null> {
  try {
    console.log(`Fetching from FastAPI: ${FASTAPI_URL}/markets/${marketId}`);
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
    console.log("FastAPI Raw Response:", JSON.stringify(data, null, 2));
    return data.market;
  } catch (error) {
    console.error(`Error fetching from FastAPI:`, error);
    return null;
  }
}

function validateMarketData(market: LimitlessMarket): boolean {
  if (!market.id || !market.question) {
    console.log("Missing required fields:", { id: market.id, question: market.question });
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
    console.log(`Transforming market ${marketId}`);
    
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
        address: fastAPIData.collateral_token_address,
        symbol: fastAPIData.collateral_token_symbol,
        decimals: fastAPIData.collateral_token_decimals,
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

    console.log("Transformed market:", market);
    return market;

  } catch (error) {
    console.error(`Error transforming market ${marketId}:`, error);
    return null;
  }
};

export async function fetchMarketsByIds(addresses: string[]): Promise<LimitlessMarket[]> {
  console.log("Fetching markets for addresses:", addresses);
  
  try {
    const marketPromises = addresses.map(address => transformMarket(address));
    const markets = await Promise.all(marketPromises);
    
    const validMarkets = markets.filter((market): market is LimitlessMarket => {
      if (!market) {
        return false;
      }
      return validateMarketData(market);
    });

    console.log(`Successfully processed ${validMarkets.length} out of ${addresses.length} markets`);
    return validMarkets;
  } catch (error) {
    console.error("Error fetching markets:", error);
    return [];
  }
}

export async function fetchMarketById(address: string): Promise<LimitlessMarket | null> {
  try {
    console.log(`Fetching single market: ${address}`);
    return await transformMarket(address);
  } catch (error) {
    console.error(`Error fetching market ${address}:`, error);
    return null;
  }
}