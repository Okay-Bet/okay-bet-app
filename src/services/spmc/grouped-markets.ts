/**
 * SPMC Grouped Markets Service
 * 
 * Since the `/markets/grouped` endpoint is not yet available,
 * this service uses the Groups API to create grouped markets functionality
 */

import { spmcClient } from './client';
import { SPMCGroup, SPMCMarket, Platform } from './types';
import { GroupedMarketCard } from '@/components/types/market';
import { transformToKalshiMarket, transformToPolymarketMarket, transformToLimitlessMarket } from './transformers';

/**
 * Strategy for getting grouped markets:
 * 1. Use existing groups with markets
 * 2. Create automatic groups based on similarity
 * 3. Cache groups for performance
 */

interface GroupedMarketStrategy {
  useExistingGroups: boolean;
  createAutoGroups: boolean;
  cacheEnabled: boolean;
  cacheDuration: number; // milliseconds
}

const defaultStrategy: GroupedMarketStrategy = {
  useExistingGroups: true,
  createAutoGroups: true,
  cacheEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Cache for grouped markets
let groupedMarketsCache: {
  data: GroupedMarketCard[];
  timestamp: number;
} | null = null;

/**
 * Fetch grouped markets using Groups API
 */
export async function fetchGroupedMarkets(
  limit = 10,
  offset = 0,
  strategy = defaultStrategy
): Promise<GroupedMarketCard[]> {
  // Check cache
  if (strategy.cacheEnabled && groupedMarketsCache) {
    const cacheAge = Date.now() - groupedMarketsCache.timestamp;
    if (cacheAge < strategy.cacheDuration) {
      return groupedMarketsCache.data.slice(offset, offset + limit);
    }
  }

  const groupedMarkets: GroupedMarketCard[] = [];

  try {
    if (strategy.useExistingGroups) {
      // Fetch existing groups
      const groupsResponse = await spmcClient.listGroups({ limit: 50 });
      
      if (groupsResponse.success && groupsResponse.data) {
        const { groups } = groupsResponse.data;
        
        // Process groups with markets
        for (const group of groups) {
          if (group.market_count > 0) {
            // Get full group details with markets
            const groupDetailResponse = await spmcClient.getGroup(group.id);
            
            if (groupDetailResponse.success && groupDetailResponse.data) {
              const fullGroup = groupDetailResponse.data;
              const groupedMarket = await transformGroupToGroupedMarket(fullGroup);
              if (groupedMarket) {
                groupedMarkets.push(groupedMarket);
              }
            }
          }
        }
      }
    }

    if (strategy.createAutoGroups && groupedMarkets.length < limit) {
      // Fetch individual markets to create auto-groups
      const marketsResponse = await spmcClient.listMarkets({ limit: 100 });
      
      if (marketsResponse.success && marketsResponse.data) {
        const markets = marketsResponse.data.markets;
        const autoGroups = createAutoGroups(markets);
        groupedMarkets.push(...autoGroups);
      }
    }

    // Update cache
    if (strategy.cacheEnabled) {
      groupedMarketsCache = {
        data: groupedMarkets,
        timestamp: Date.now(),
      };
    }

    return groupedMarkets.slice(offset, offset + limit);
  } catch (error) {
    console.error('Error fetching grouped markets:', error);
    return [];
  }
}

/**
 * Transform SPMC Group to GroupedMarketCard
 */
async function transformGroupToGroupedMarket(group: SPMCGroup): Promise<GroupedMarketCard | null> {
  if (!group.markets || group.markets.length === 0) {
    return null;
  }

  // Fetch full market details for each market in the group
  const kalshiMarkets: any[] = [];
  const polymarketMarkets: any[] = [];
  const limitlessMarkets: any[] = [];
  
  let totalVolume = 0;
  let highestLiquidity = 0;

  for (const groupMarket of group.markets) {
    try {
      // Fetch market details
      const marketResponse = await spmcClient.getMarket(groupMarket.market_id);
      
      if (marketResponse.success && marketResponse.data) {
        const market = marketResponse.data;
        
        // Add to appropriate platform array
        const marketWithSimilarity = {
          market: transformMarketByPlatform(market),
          similarity: groupMarket.weight || 1,
        };

        switch (market.platform) {
          case 'kalshi':
            kalshiMarkets.push(marketWithSimilarity);
            break;
          case 'polymarket':
            polymarketMarkets.push(marketWithSimilarity);
            break;
          case 'limitless':
            limitlessMarkets.push(marketWithSimilarity);
            break;
        }

        // Update metrics
        totalVolume += market.volume_24h || 0;
        highestLiquidity = Math.max(highestLiquidity, market.liquidity || 0);
      }
    } catch (error) {
      console.error(`Failed to fetch market ${groupMarket.market_id}:`, error);
    }
  }

  return {
    id: group.id,
    title: group.title,
    metrics: {
      totalVolume,
      highestLiquidity,
      platforms: {
        kalshi: {
          markets: kalshiMarkets.map(m => ({
            id: m.market.id,
            volume: parseFloat(m.market.metrics?.volume || '0'),
            liquidity: parseFloat(m.market.metrics?.liquidity || '0'),
            openInterest: parseFloat(m.market.metrics?.openInterest || '0'),
          })),
        },
        polymarket: {
          markets: polymarketMarkets.map(m => ({
            id: m.market.id,
            volume: parseFloat(m.market.metrics?.volume || '0'),
            liquidity: parseFloat(m.market.metrics?.liquidity || '0'),
          })),
        },
        limitless: {
          markets: limitlessMarkets.map(m => ({
            id: m.market.id,
            volume: parseFloat(m.market.metrics?.volume || '0'),
            openInterest: parseFloat(m.market.metrics?.openInterest || '0'),
          })),
        },
      },
    },
    kalshiMarkets,
    polymarketMarkets,
    limitlessMarkets,
  };
}

/**
 * Transform market by platform
 */
function transformMarketByPlatform(market: SPMCMarket) {
  switch (market.platform) {
    case 'kalshi':
      return transformToKalshiMarket(market);
    case 'polymarket':
      return transformToPolymarketMarket(market);
    case 'limitless':
      return transformToLimitlessMarket(market);
    default:
      return transformToPolymarketMarket(market);
  }
}

/**
 * Create automatic groups from similar markets
 */
function createAutoGroups(markets: SPMCMarket[]): GroupedMarketCard[] {
  const groups: GroupedMarketCard[] = [];
  const processedMarkets = new Set<string>();

  for (const market of markets) {
    if (processedMarkets.has(market.id)) continue;

    // Find similar markets
    const similarMarkets = findSimilarMarkets(market, markets);
    
    if (similarMarkets.length > 1) {
      // Create a group from similar markets
      const group = createGroupFromMarkets(market, similarMarkets);
      groups.push(group);
      
      // Mark all markets as processed
      similarMarkets.forEach(m => processedMarkets.add(m.id));
    }
  }

  return groups;
}

/**
 * Find markets similar to the given market
 */
function findSimilarMarkets(targetMarket: SPMCMarket, allMarkets: SPMCMarket[]): SPMCMarket[] {
  const similar: SPMCMarket[] = [targetMarket];
  const targetWords = targetMarket.title.toLowerCase().split(/\s+/);

  for (const market of allMarkets) {
    if (market.id === targetMarket.id) continue;

    const marketWords = market.title.toLowerCase().split(/\s+/);
    const commonWords = targetWords.filter(word => 
      marketWords.includes(word) && word.length > 3
    );

    // If markets share significant words, consider them similar
    if (commonWords.length >= 3 || 
        (commonWords.length >= 2 && commonWords.some(w => w.length > 5))) {
      similar.push(market);
    }
  }

  return similar;
}

/**
 * Create a GroupedMarketCard from similar markets
 */
function createGroupFromMarkets(
  primaryMarket: SPMCMarket,
  similarMarkets: SPMCMarket[]
): GroupedMarketCard {
  const kalshiMarkets: any[] = [];
  const polymarketMarkets: any[] = [];
  const limitlessMarkets: any[] = [];
  
  let totalVolume = 0;
  let highestLiquidity = 0;

  for (const market of similarMarkets) {
    const transformed = {
      market: transformMarketByPlatform(market),
      similarity: market.id === primaryMarket.id ? 1 : 0.8,
    };

    switch (market.platform) {
      case 'kalshi':
        kalshiMarkets.push(transformed);
        break;
      case 'polymarket':
        polymarketMarkets.push(transformed);
        break;
      case 'limitless':
        limitlessMarkets.push(transformed);
        break;
    }

    totalVolume += market.volume_24h || 0;
    highestLiquidity = Math.max(highestLiquidity, market.liquidity || 0);
  }

  return {
    id: `auto-${primaryMarket.id}`,
    title: primaryMarket.title,
    metrics: {
      totalVolume,
      highestLiquidity,
      platforms: {
        kalshi: {
          markets: kalshiMarkets.map(m => ({
            id: m.market.id,
            volume: parseFloat(m.market.metrics?.volume || '0'),
            liquidity: parseFloat(m.market.metrics?.liquidity || '0'),
            openInterest: parseFloat(m.market.metrics?.openInterest || '0'),
          })),
        },
        polymarket: {
          markets: polymarketMarkets.map(m => ({
            id: m.market.id,
            volume: parseFloat(m.market.metrics?.volume || '0'),
            liquidity: parseFloat(m.market.metrics?.liquidity || '0'),
          })),
        },
        limitless: {
          markets: limitlessMarkets.map(m => ({
            id: m.market.id,
            volume: parseFloat(m.market.metrics?.volume || '0'),
            openInterest: parseFloat(m.market.metrics?.openInterest || '0'),
          })),
        },
      },
    },
    kalshiMarkets,
    polymarketMarkets,
    limitlessMarkets,
  };
}

/**
 * Clear the grouped markets cache
 */
export function clearGroupedMarketsCache() {
  groupedMarketsCache = null;
}