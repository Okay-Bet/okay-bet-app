// hooks/usePolymarket.ts
import { useState, useEffect } from 'react';
import { Market, MarketParams } from '../components/types/polymarket';

export const usePolymarket = (params: MarketParams) => {
  const [marketData, setMarketData] = useState<Market[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const queryParams = new URLSearchParams();
        
        // Build query parameters
        if (params.tag) queryParams.append('tag', params.tag);
        if (params.active !== undefined) queryParams.append('active', params.active.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        if (params.marketId) queryParams.append('id', params.marketId);
        if (params.minVolume) queryParams.append('volume_num_min', params.minVolume.toString());
        if (params.maxVolume) queryParams.append('volume_num_max', params.maxVolume.toString());
        if (params.minLiquidity) queryParams.append('liquidity_num_min', params.minLiquidity.toString());
        if (params.maxLiquidity) queryParams.append('liquidity_num_max', params.maxLiquidity.toString());

        const url = `https://gamma-api.polymarket.com/markets?${queryParams.toString()}`;
        console.log('Fetching from URL:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle the data as an array directly
        let markets = Array.isArray(data) ? data : [];
        console.log('Number of markets fetched:', markets.length);

        // Apply keyword filtering if specified
        if (params.keyword) {
          markets = markets.filter(market =>
            market.question?.toLowerCase().includes(params.keyword!.toLowerCase())
          );
          console.log('Markets after keyword filtering:', markets.length);
        }

        setMarketData(markets);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch market data');
        setLoading(false);
        setMarketData(null);
      }
    };

    fetchMarketData();
  }, [params]);

  return { marketData, loading, error };
};