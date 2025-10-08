"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { spmcClient } from "@/services/spmc/client";
import { SPMCGroup, Platform } from "@/services/spmc/types";
import { GroupFundMetadata } from "@/services/funds/groupFundIntegration.service";
import Navbar from "@/components/Common/Navbar";
import { HeroSection } from "@/components/homepage/HeroSection";
import { IndexShowcase } from "@/components/homepage/IndexShowcase";
import { MarketAllocation } from "@/components/homepage/IndexCard";

export default function Home() {
  const router = useRouter();
  const [groups, setGroups] = useState<SPMCGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use API proxy instead of direct SPMC client call
      // Reduce limit to avoid timeouts on slower networks
      const response = await fetch('/api/groups?limit=50&group_type=index');

      if (!response.ok) {
        // Try to extract error message from response
        let errorMessage = `Failed to load groups (${response.status})`;

        // Provide helpful message for common errors
        if (response.status === 504) {
          errorMessage = 'The market data service is temporarily slow. Please try refreshing the page.';
        }

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response isn't JSON, use default message
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse groups response:', parseError);
        throw new Error('Invalid response format from server');
      }

      if (data && data.groups) {
        // Filter to only get index type groups (show all indexes regardless of fund deployment)
        const indexGroups = data.groups.filter(
          (group: SPMCGroup) => group.group_type === "index"
        );

        // Load details for each index to get market information
        const groupsWithDetails = await Promise.all(
          indexGroups.map(async (group: SPMCGroup) => {
            try {
              // Use API proxy for group details
              const detailResponse = await fetch(`/api/groups/${group.id}`);

              if (!detailResponse.ok) {
                // Failed to fetch group details, return group without details
                console.warn(`Failed to fetch details for group ${group.id}: ${detailResponse.status}`);
                return group;
              }

              let groupWithDetails: SPMCGroup;
              try {
                groupWithDetails = await detailResponse.json();
              } catch (parseError) {
                console.warn(`Failed to parse group details for ${group.id}:`, parseError);
                return group;
              }

              if (groupWithDetails) {

                // Fetch accurate prices for each market in the group
                if (
                  groupWithDetails.markets &&
                  groupWithDetails.markets.length > 0
                ) {
                  // Try batch price fetching first using SPMC prices endpoint via API proxy
                  try {
                    const marketIds = groupWithDetails.markets.map(
                      (m) => m.market_id
                    );
                    const platforms = [
                      ...new Set(
                        groupWithDetails.markets
                          .map((m) => m.market_platform)
                          .filter((p): p is Platform => Boolean(p))
                      ),
                    ];

                    // Use API proxy for prices
                    const pricesResponse = await fetch('/api/spmc/prices', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        marketIds: marketIds,
                        platforms: platforms.length > 0 ? platforms : undefined,
                      }),
                    });

                    if (pricesResponse.ok) {
                      try {
                        const pricesData = await pricesResponse.json();
                        const pricesMap = pricesData.prices;

                      const marketsWithPrices = groupWithDetails.markets.map(
                        (market) => {
                          const priceData = pricesMap[market.market_id];
                          let currentPrice = market.market_current_price || 0.5;

                          if (priceData && priceData.prices) {
                            // SPMC batch API returns prices in the format:
                            // { platform, prices: { bid, ask, last, mid } }
                            const outcome = market.outcome || "yes";

                            // Use mid price as base
                            const basePrice = priceData.prices.mid;

                            if (outcome === "no") {
                              // For NO positions, invert the price
                              currentPrice = 1 - basePrice;
                            } else {
                              // For YES positions, use price directly
                              currentPrice = basePrice;
                            }
                          }

                          return {
                            ...market,
                            market_current_price: currentPrice,
                          };
                        }
                      );

                      return {
                        ...groupWithDetails,
                        markets: marketsWithPrices,
                      };
                      } catch (jsonError) {
                        // JSON parsing failed, log and continue
                        console.warn('Failed to parse prices response:', jsonError);
                      }
                    }
                  } catch (err) {
                    // Batch price fetch failed, falling back to individual fetches
                    console.warn('Batch price fetch failed:', err);
                  }

                  // Fallback to individual market fetches if batch fails
                  const marketsWithPrices = await Promise.all(
                    groupWithDetails.markets.map(async (market) => {
                      try {
                        // Try getting ticker data first
                        try {
                          const tickerResponse = await spmcClient.getTicker(
                            market.market_id
                          );
                          if (tickerResponse.success && tickerResponse.data) {
                            if (tickerResponse.data.lastPrice !== undefined) {
                              return {
                                ...market,
                                market_current_price:
                                  tickerResponse.data.lastPrice,
                              };
                            }
                          }
                        } catch (tickerErr) {
                          // Ticker fetch failed, try market endpoint
                        }

                        // Fallback to market details
                        const marketResponse = await spmcClient.getMarket(
                          market.market_id,
                          market.market_platform
                        );

                        if (marketResponse.success && marketResponse.data) {
                          const marketData = marketResponse.data;

                          let currentPrice = market.market_current_price || 0.5;
                          const outcome = market.outcome || "yes";

                          // SPMC market endpoint returns prices in the nested format
                          if (marketData.prices) {
                            // Try the simple structure first (for direct price data)
                            if (typeof marketData.prices.mid === "number") {
                              currentPrice = marketData.prices.mid;
                            } else if (outcome === "yes") {
                              // Check different price structures for YES outcome
                              if ((marketData.prices as any).yes) {
                                currentPrice =
                                  (marketData.prices as any).yes.ask ||
                                  (marketData.prices as any).yes.last ||
                                  currentPrice;
                              } else if ((marketData.prices as any).YES) {
                                currentPrice =
                                  (marketData.prices as any).YES.ask ||
                                  (marketData.prices as any).YES.last ||
                                  currentPrice;
                              }
                            } else if (outcome === "no") {
                              // Check different price structures for NO outcome
                              if ((marketData.prices as any).no) {
                                currentPrice =
                                  (marketData.prices as any).no.ask ||
                                  (marketData.prices as any).no.last ||
                                  currentPrice;
                              } else if ((marketData.prices as any).NO) {
                                currentPrice =
                                  (marketData.prices as any).NO.ask ||
                                  (marketData.prices as any).NO.last ||
                                  currentPrice;
                              }
                            }
                          }

                          // Check for direct price fields as last resort
                          if (currentPrice === 0.5 || !currentPrice) {
                            currentPrice =
                              (marketData as any).current_price ||
                              (marketData as any).last_price ||
                              (marketData as any).lastPrice ||
                              currentPrice;
                          }

                          return {
                            ...market,
                            market_current_price: currentPrice,
                            market_title:
                              marketData.title || market.market_title,
                            market_expiration_date:
                              marketData.expiration_date ||
                              marketData.market_close_time ||
                              marketData.closes_at ||
                              market.market_expiration_date,
                          };
                        }

                        return market;
                      } catch (err) {
                        // Failed to fetch price for this market, use existing data
                        return market;
                      }
                    })
                  );

                  return {
                    ...groupWithDetails,
                    markets: marketsWithPrices,
                  };
                }

                return groupWithDetails;
              }
              return group;
            } catch {
              return group;
            }
          })
        );

        setGroups(groupsWithDetails);
      } else {
        setError("Failed to load market indexes");
      }
    } catch (err) {
      setError(
        `Error loading market indexes: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      console.error("Error loading groups:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async (
    groupId: string,
    allocations: MarketAllocation[]
  ) => {
    console.log("Investing in group:", groupId);
    console.log("Allocations:", allocations);

    // In a real implementation, this would:
    // 1. Connect to user's wallet
    // 2. Execute trades on each platform
    // 3. Track the investment
    // 4. Show confirmation

    // For now, just show an alert
    const totalAmount = allocations.reduce(
      (sum, a) => sum + a.allocationAmount,
      0
    );
    alert(
      `Investment of $${totalAmount.toFixed(2)} across ${
        allocations.length
      } markets would be executed here.`
    );
  };

  const handleCreateIndex = () => {
    // Route to groups page with create tab active
    router.push("/groups?tab=create");
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <Navbar />

      {/* Hero Section */}
      <div className="pt-16">
        <HeroSection />
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Funds Section - This is where "Browse Funds" button links to */}
      <section id="funds" className="scroll-mt-16">
        <IndexShowcase
          groups={groups}
          loading={loading}
          onInvest={handleInvest}
          onCreateIndex={handleCreateIndex}
          fundAddresses={
            // Extract fund addresses from group metadata
            groups.reduce((acc, group) => {
              const metadata = group.metadata as GroupFundMetadata;
              if (metadata?.fund_deployment?.contract_address) {
                acc[group.id] = metadata.fund_deployment.contract_address;
              }
              return acc;
            }, {} as Record<string, string>)
          }
        />
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="relative bg-gradient-to-b from-white to-gray-50 py-16 scroll-mt-16"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              How it works
            </h2>
            
            {/* 
            REPLACE WITH GRAPHIC
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              Deposit USDC into a strategy vault that will issue you shares. The funds will be used to enter Polymarket positions and will be redeemable after the set period.
            </p> */}
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Browse */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-secondary mb-2">
                Browse Funds
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Deposit
              </h3>
              <p className="text-gray-600 text-sm">
                Select the strategy you like and deposit USDC in exchange for token shares
              </p>
            </div>

            {/* Step 2: Invest */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-secondary mb-2">
                Monitor
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Trade
              </h3>
              <p className="text-gray-600 text-sm">
                The funds are managed by agents to place prediction market positions along set indexes and strategies.
              </p>
            </div>

            {/* Step 3: Track */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-secondary mb-2">
                Redeem
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Track & withdraw
              </h3>
              <p className="text-gray-600 text-sm">
                After the trading period redeem your shares for the equivalent size of the fund.
              </p>
            </div>
          </div>


          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">No minimums</span> •
              <span className="font-semibold"> Transparent fees</span> •
              <span className="font-semibold"> Non-custodial</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
