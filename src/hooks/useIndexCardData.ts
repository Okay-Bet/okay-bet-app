import { useState, useEffect } from 'react';
import { SPMCGroup, SPMCGroupMarket } from '@/services/spmc/types';
import { spmcClient } from '@/services/spmc';
import { MarketAllocation } from '@/components/homepage/IndexCard';

interface UseIndexCardDataOptions {
  group: SPMCGroup;
  investmentAmount: string;
}

interface UseIndexCardDataReturn {
  marketsWithPrices: SPMCGroupMarket[];
  loadingPrices: boolean;
  indexPrice: number;
  priceColors: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
  marketAllocations: MarketAllocation[];
  totalWeight: number;
}

/**
 * Hook to manage IndexCard data: real-time prices, allocations, and color coding
 */
export function useIndexCardData({
  group,
  investmentAmount
}: UseIndexCardDataOptions): UseIndexCardDataReturn {
  const [marketsWithPrices, setMarketsWithPrices] = useState<SPMCGroupMarket[]>(
    group.markets || []
  );
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Fetch real-time prices for markets
  useEffect(() => {
    const fetchPrices = async () => {
      if (!group.markets || group.markets.length === 0) return;

      setLoadingPrices(true);
      try {
        const marketIds = group.markets.map(m => m.market_id);
        const pricesResponse = await spmcClient.getMarketPrices({ marketIds });

        if (pricesResponse.success && pricesResponse.data?.prices) {
          const pricesMap = pricesResponse.data.prices;

          const updated = group.markets.map((market) => {
            const priceData = pricesMap[market.market_id];
            let currentPrice = market.market_current_price || 0.5;

            if (priceData && priceData.prices) {
              const outcome = market.outcome?.toLowerCase() || 'yes';
              const basePrice = priceData.prices.mid;

              // Invert price for NO outcomes
              currentPrice = outcome === 'no' ? (1 - basePrice) : basePrice;
            }

            return {
              ...market,
              market_current_price: currentPrice
            };
          });

          setMarketsWithPrices(updated);
        }
      } catch (error) {
        console.error('Failed to fetch real-time prices:', error);
        setMarketsWithPrices(group.markets || []);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchPrices();
  }, [group.markets]);

  // Calculate total weight
  const totalWeight = marketsWithPrices?.reduce((sum, m) => sum + (m.weight || 1), 0) || 1;

  // Calculate weighted average index price
  const calculateIndexPrice = (): number => {
    if (!marketsWithPrices || marketsWithPrices.length === 0) return 0;

    const totalWeight = marketsWithPrices.reduce((sum, m) => sum + (m.weight || 1), 0);
    if (totalWeight === 0) return 0;

    const weightedSum = marketsWithPrices.reduce((sum, m) => {
      const price = m.market_current_price || 0;
      const weight = m.weight || 1;
      return sum + (price * weight);
    }, 0);

    return weightedSum / totalWeight;
  };

  const indexPrice = calculateIndexPrice();

  // Determine color based on price sentiment
  const getPriceColorClasses = () => {
    if (indexPrice >= 0.55) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        accent: 'text-green-600'
      };
    } else if (indexPrice <= 0.45) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        accent: 'text-red-600'
      };
    } else {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        accent: 'text-gray-600'
      };
    }
  };

  const priceColors = getPriceColorClasses();

  // Calculate market allocations
  const marketAllocations: MarketAllocation[] = marketsWithPrices?.map((market) => {
    const weight = market.weight || 1;
    const percentage = (weight / totalWeight) * 100;
    const amount = parseFloat(investmentAmount) || 0;
    const allocationAmount = (amount * weight) / totalWeight;

    return {
      marketId: market.market_id,
      marketTitle: market.market_title || market.market_id,
      platform: market.market_platform || 'Unknown',
      outcome: market.outcome || 'yes',
      weight,
      currentPrice: market.market_current_price || 0.5,
      allocationAmount,
      expectedShares: market.market_current_price ? allocationAmount / market.market_current_price : 0,
      percentage,
      resolutionDate: market.market_expiration_date || market.market_close_time || market.market_closes_at
    };
  }) || [];

  return {
    marketsWithPrices,
    loadingPrices,
    indexPrice,
    priceColors,
    marketAllocations,
    totalWeight
  };
}
