/**
 * SPMC Client Service
 * 
 * A flexible client for interacting with the SPMC (Scheinberg Prediction Market Corporation) API.
 * Designed to handle rapid API changes during active development.
 */

import {
  SPMCConfig,
  SPMCResponse,
  SPMCError,
  SPMCMarketsRequest,
  SPMCMarketsResponse,
  SPMCSearchRequest,
  SPMCSearchResponse,
  SPMCPricesRequest,
  SPMCPricesResponse,
  SPMCQuotesRequest,
  SPMCHistoryRequest,
  SPMCHistoryResponse,
  SPMCMarket,
  SPMCTicker,
  SPMCGroup,
  SPMCGlobalStats,
  SPMCHealthScore,
  SPMCConsolidatedMarket,
  Platform
} from './types';

export class SPMCClient {
  private baseUrl: string;
  private apiVersion: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config?: Partial<SPMCConfig>) {
    const defaultConfig: SPMCConfig = {
      baseUrl: process.env.FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev',
      apiVersion: process.env.SPMC_API_VERSION || 'v1',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    this.baseUrl = finalConfig.baseUrl;
    this.apiVersion = finalConfig.apiVersion;
    this.timeout = finalConfig.timeout;
    this.retryAttempts = finalConfig.retryAttempts;
    this.retryDelay = finalConfig.retryDelay;
  }

  /**
   * Make a request to the SPMC server with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SPMCResponse<T>> {
    // Use endpoint as-is without modifying trailing slashes
    const url = `${this.baseUrl}/api/${this.apiVersion}${endpoint}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          mode: 'cors',  // Explicitly set CORS mode
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error: SPMCError = {
            status: response.status,
            message: `SPMC request failed: ${response.statusText}`,
            endpoint,
            timestamp: new Date().toISOString(),
          };

          // Try to parse error details from response
          try {
            const errorData = await response.json();
            error.details = errorData;
          } catch {
            // Ignore JSON parse errors
          }

          throw error;
        }

        const data = await response.json();
        
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if ((error as SPMCError).status && (error as SPMCError).status >= 400 && (error as SPMCError).status < 500) {
          break;
        }

        // Wait before retrying
        if (attempt < this.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries failed
    const finalError: SPMCError = lastError && 'status' in lastError 
      ? lastError as SPMCError
      : {
          status: 500,
          message: lastError?.message || 'Request failed after all retries',
          endpoint,
          timestamp: new Date().toISOString(),
        };
    
    return {
      success: false,
      error: finalError,
      timestamp: new Date().toISOString(),
    };
  }

  // ============= Core Endpoints =============

  /**
   * Health check
   */
  async health() {
    return this.request<{ status: string }>('/health');
  }

  /**
   * Ready check
   */
  async ready() {
    return this.request<{ ready: boolean }>('/ready');
  }

  // ============= Markets Endpoints =============

  /**
   * List markets with filtering and pagination
   */
  async listMarkets(params: SPMCMarketsRequest = {}): Promise<SPMCResponse<any>> {
    const queryParams = new URLSearchParams();
    
    // Convert platform to lowercase if provided
    if (params.platform) {
      queryParams.append('platform', params.platform.toLowerCase());
    }
    
    // Add other parameters
    ['limit', 'offset', 'status', 'sortBy', 'sortOrder'].forEach(key => {
      const value = params[key as keyof SPMCMarketsRequest];
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/markets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<any>(endpoint);
    
    // Transform the response to match expected structure
    if (response.success && response.data) {
      const transformed = {
        markets: response.data.data || [],
        pagination: response.data.pagination || {
          total: response.data.meta?.total || 0,
          limit: params.limit || 50,
          offset: params.offset || 0,
          hasMore: false
        }
      };
      return {
        ...response,
        data: transformed
      };
    }
    
    return response;
  }

  /**
   * Search markets - Use the proper search endpoint
   */
  async searchMarkets(params: SPMCSearchRequest): Promise<SPMCResponse<SPMCSearchResponse>> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add search query (required, minimum 2 characters)
      if (params.query && params.query.length >= 2) {
        queryParams.append('q', params.query);
      } else if (params.query) {
        // If query is less than 2 characters, return empty results
        return {
          success: true,
          data: {
            markets: [],
            query: params.query,
            totalResults: 0,
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        // If no query, fetch all markets instead
        const url = `${this.baseUrl}/api/${this.apiVersion}/markets/?limit=${params.limit || 50}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch markets: ${response.status}`);
        }
        
        const responseData = await response.json();
        const marketsArray = responseData.data || [];
        
        const markets = marketsArray.slice(0, params.limit || 50).map((market: any) => ({
          id: market.id,
          platform: market.platform,
          platform_market_id: market.platform_market_id,
          title: market.title,
          status: market.status || 'active',
          is_active: market.is_active !== false,
          current_price: market.prices?.last || market.prices?.mid || 0,
          volume_24h: market.volume_24h || 0,
          liquidity: market.liquidity || 0,
          category: market.category,
          updated_at: market.updated_at
        }));
        
        return {
          success: true,
          data: {
            markets,
            query: '',
            totalResults: markets.length,
          },
          timestamp: new Date().toISOString(),
        };
      }
      
      // Add other parameters
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      } else {
        queryParams.append('limit', '50');
      }
      
      if (params.offset) {
        queryParams.append('offset', params.offset.toString());
      }
      
      if (params.platforms && params.platforms.length > 0) {
        queryParams.append('platform', params.platforms[0].toLowerCase());
      }
      
      if (params.status) {
        queryParams.append('status', params.status);
      }
      
      // Include inactive markets by default for broader search results
      queryParams.append('include_inactive', 'true');
      
      // Use the search endpoint (no trailing slash to avoid redirect)
      const url = `${this.baseUrl}/api/${this.apiVersion}/markets/search?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          console.error('Invalid search query');
          return {
            success: false,
            error: { status: 400, message: 'Invalid search query (minimum 2 characters required)' },
            timestamp: new Date().toISOString(),
          };
        }
        throw new Error(`Failed to search markets: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Handle the response - API returns {status: "success", markets: [...]}
      const marketsArray = responseData.markets || responseData.data || responseData.results || [];
      
      // Transform to expected response structure
      const markets = marketsArray.map((market: any) => {
        
        // Handle different price field names
        let currentPrice = 0;
        if (market.prices) {
          currentPrice = market.prices.last_trade || 
                        market.prices.last || 
                        market.prices.mid || 
                        market.prices.best_bid || 
                        0;
        } else if (market.last_price !== undefined) {
          currentPrice = market.last_price;
        } else if (market.current_price !== undefined) {
          currentPrice = market.current_price;
        }
        
        // Handle volume field variations
        const volume = market.volume || 
                       market.volume_24h || 
                       market.total_volume || 
                       0;
        
        return {
          id: market.id,
          platform: market.platform,
          platform_market_id: market.platform_market_id,
          title: market.title,
          status: market.status || 'active',
          is_active: market.is_active !== false,
          current_price: currentPrice,
          volume_24h: volume,
          liquidity: market.liquidity || 0,
          category: market.category,
          updated_at: market.updated_at,
          market_close_time: market.market_close_time,
          closes_at: market.closes_at,
          expiration_date: market.expiration_date
        };
      });
      
      // Get total count from API response
      const totalCount = responseData.total_count || markets.length;
      
      return {
        success: true,
        data: {
          markets,
          query: params.query || '',
          totalResults: totalCount,  // Use the total_count from API
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error searching markets:', error);
      return {
        success: false,
        error: { 
          status: 500, 
          message: error instanceof Error ? error.message : 'Failed to search markets' 
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get specific market details
   */
  async getMarket(marketId: string, platform?: Platform): Promise<SPMCResponse<SPMCMarket>> {
    const endpoint = platform 
      ? `/markets/${marketId}?platform=${platform}`
      : `/markets/${marketId}`;
    
    const response = await this.request<any>(endpoint);
    
    // Handle wrapped response from SPMC API
    if (response.success && response.data) {
      // If the response has a nested data structure (status, data, meta)
      if (response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          timestamp: response.timestamp
        };
      }
      // Otherwise return as is
      return response as SPMCResponse<SPMCMarket>;
    }
    
    return response;
  }

  /**
   * Get batch market quotes
   */
  async getMarketQuotes(params: SPMCQuotesRequest) {
    return this.request('/markets/quotes', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get historical market data
   */
  async getMarketHistory(params: SPMCHistoryRequest): Promise<SPMCResponse<SPMCHistoryResponse>> {
    const queryParams = new URLSearchParams();

    if (params.interval) {
      queryParams.append('interval', params.interval);
    }
    if (params.fidelity) {
      queryParams.append('fidelity', params.fidelity.toString());
    }
    if (params.startTime) {
      queryParams.append('start_time', params.startTime.toString());
    }
    if (params.endTime) {
      queryParams.append('end_time', params.endTime.toString());
    }

    const endpoint = `/markets/market/${params.marketId}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<SPMCHistoryResponse>(endpoint);
  }

  /**
   * Get real-time market prices
   * Note: API expects market_ids (snake_case), not marketIds (camelCase)
   */
  async getMarketPrices(params: SPMCPricesRequest): Promise<SPMCResponse<SPMCPricesResponse>> {
    // Convert camelCase to snake_case for API
    const requestBody = {
      market_ids: params.marketIds
    };

    const response = await this.request<SPMCPricesResponse>('/markets/prices', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return response;
  }

  // ============= Tickers Endpoints =============

  /**
   * Get all market tickers
   */
  async getAllTickers(): Promise<SPMCResponse<SPMCTicker[]>> {
    return this.request<SPMCTicker[]>('/tickers');
  }

  /**
   * Get single market ticker
   */
  async getTicker(marketId: string): Promise<SPMCResponse<SPMCTicker>> {
    return this.request<SPMCTicker>(`/tickers/${marketId}`);
  }

  // ============= Statistics Endpoints =============

  /**
   * Get comprehensive global market statistics
   */
  async getGlobalStats(): Promise<SPMCResponse<SPMCGlobalStats>> {
    return this.request<SPMCGlobalStats>('/stats/global');
  }

  /**
   * Get system health evaluation
   */
  async getHealthScore(): Promise<SPMCResponse<SPMCHealthScore>> {
    return this.request<SPMCHealthScore>('/stats/health-score');
  }

  // ============= Groups Endpoints =============

  /**
   * Create a new group
   */
  async createGroup(group: {
    title: string;
    description?: string;
    group_type: 'watchlist' | 'portfolio' | 'index' | 'arbitrage' | 'correlated' | 'inverse' | 'same_event';
    markets?: Array<{
      market_id: string;
      weight?: number;
      position_type?: string;
    }>;
  }): Promise<SPMCResponse<SPMCGroup>> {
    // Add trailing slash to avoid redirect which causes CORS issues
    const response = await this.request<any>('/groups/', {
      method: 'POST',
      body: JSON.stringify(group),
    });
    
    // API currently returns the created group directly
    if (response.success && response.data && !Array.isArray(response.data)) {
      return response;
    }
    
    return response;
  }

  /**
   * Get group by ID with full market details
   */
  async getGroup(groupId: string): Promise<SPMCResponse<SPMCGroup>> {
    return this.request<SPMCGroup>(`/groups/${groupId}`);
  }

  /**
   * List all groups
   */
  async listGroups(params?: {
    limit?: number;
    offset?: number;
    group_type?: string;
  }): Promise<SPMCResponse<{ groups: SPMCGroup[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/groups/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<{ groups: SPMCGroup[]; total: number }>(endpoint);
  }

  /**
   * Add markets to a group
   */
  async addMarketsToGroup(groupId: string, markets: Array<{
    market_id: string;
    weight?: number;
    position_type?: string;
    outcome?: 'yes' | 'no' | 'both';
  }>): Promise<SPMCResponse<SPMCGroup>> {
    return this.request<SPMCGroup>(`/groups/${groupId}/markets`, {
      method: 'POST',
      body: JSON.stringify({ markets }),
    });
  }

  /**
   * Remove market from a group
   */
  async removeMarketFromGroup(groupId: string, marketId: string): Promise<SPMCResponse<void>> {
    return this.request<void>(`/groups/${groupId}/markets/${marketId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update group metadata
   */
  async updateGroup(groupId: string, updates: {
    title?: string;
    description?: string;
    display_settings?: any;
    metadata?: any;
  }): Promise<SPMCResponse<SPMCGroup>> {
    return this.request<SPMCGroup>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string): Promise<SPMCResponse<void>> {
    return this.request<void>(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  // ============= Legacy/Compatibility Endpoints =============

  /**
   * Fetch consolidated markets (legacy endpoint for compatibility)
   * This endpoint might be specific to your current SPMC deployment
   */
  async fetchConsolidatedMarkets(params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<SPMCResponse<SPMCConsolidatedMarket[]>> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const endpoint = `/grouped-markets/fetch_consolidated_markets?${queryParams.toString()}`;
    return this.request<SPMCConsolidatedMarket[]>(endpoint);
  }

  // ============= Utility Methods =============

  /**
   * Set a new base URL (useful for switching between environments)
   */
  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set API version
   */
  setApiVersion(version: string) {
    this.apiVersion = version;
  }

  /**
   * Get current configuration
   */
  getConfig(): SPMCConfig {
    return {
      baseUrl: this.baseUrl,
      apiVersion: this.apiVersion,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
    };
  }
}

// Singleton instance for easy import
export const spmcClient = new SPMCClient();

// Export for custom configurations
export default SPMCClient;