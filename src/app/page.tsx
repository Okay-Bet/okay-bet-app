"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { spmcClient } from "@/services/spmc/client";
import { SPMCGroup } from "@/services/spmc/types";
import Logo from "@/components/Logo/Logo";
import { HeroSection } from "@/components/homepage/HeroSection";
import { IndexShowcase } from "@/components/homepage/IndexShowcase";
import { MarketAllocation } from "@/components/homepage/IndexCard";

export default function Home() {
  const router = useRouter();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [groups, setGroups] = useState<SPMCGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await spmcClient.listGroups({ limit: 100 });
      if (response.success && response.data) {
        // Filter to only get indexes (not portfolios)
        const indexGroups = response.data.groups.filter(
          (group) => group.group_type === "index"
        );

        // Load details for each index to get market information
        const groupsWithDetails = await Promise.all(
          indexGroups.map(async (group) => {
            try {
              const detailResponse = await spmcClient.getGroup(group.id);
              if (detailResponse.success && detailResponse.data) {
                const groupWithDetails = detailResponse.data;

                // Fetch accurate prices for each market in the group
                if (
                  groupWithDetails.markets &&
                  groupWithDetails.markets.length > 0
                ) {
                  // Try batch price fetching first using SPMC prices endpoint
                  try {
                    const marketIds = groupWithDetails.markets.map(
                      (m) => m.market_id
                    );
                    const platforms = [
                      ...new Set(
                        groupWithDetails.markets
                          .map((m) => m.market_platform)
                          .filter(Boolean)
                      ),
                    ];

                    const pricesResponse = await spmcClient.getMarketPrices({
                      marketIds: marketIds,
                      platforms: platforms.length > 0 ? platforms : undefined,
                    });

                    if (pricesResponse.success && pricesResponse.data?.prices) {
                      const pricesMap = pricesResponse.data.prices;

                      const marketsWithPrices = groupWithDetails.markets.map(
                        (market) => {
                          const priceData = pricesMap[market.market_id];
                          let currentPrice = market.market_current_price || 0.5;

                          if (priceData) {
                            // SPMC API returns prices in the format:
                            // { yes: { ask: 0.xx, bid: 0.xx, last: 0.xx, mid: 0.xx }, no: {...} }
                            // We want the price for the outcome specified in the market
                            const outcome = market.outcome || "yes";

                            if (outcome === "yes" && priceData.yes) {
                              // For YES outcome, use ask price (what you'd pay to buy)
                              currentPrice =
                                priceData.yes.ask ||
                                priceData.yes.last ||
                                priceData.yes.mid ||
                                currentPrice;
                            } else if (outcome === "no" && priceData.no) {
                              // For NO outcome, use ask price
                              currentPrice =
                                priceData.no.ask ||
                                priceData.no.last ||
                                priceData.no.mid ||
                                currentPrice;
                            } else if (priceData.yes) {
                              // Default to YES price if outcome not specified
                              currentPrice =
                                priceData.yes.ask ||
                                priceData.yes.last ||
                                priceData.yes.mid ||
                                currentPrice;
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
                    }
                  } catch (err) {
                    // Batch price fetch failed, falling back to individual fetches
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
                              if (marketData.prices.yes) {
                                currentPrice =
                                  marketData.prices.yes.ask ||
                                  marketData.prices.yes.last ||
                                  marketData.prices.yes.mid ||
                                  currentPrice;
                              } else if (marketData.prices.YES) {
                                currentPrice =
                                  marketData.prices.YES.ask ||
                                  marketData.prices.YES.last ||
                                  marketData.prices.YES.mid ||
                                  currentPrice;
                              }
                            } else if (outcome === "no") {
                              // Check different price structures for NO outcome
                              if (marketData.prices.no) {
                                currentPrice =
                                  marketData.prices.no.ask ||
                                  marketData.prices.no.last ||
                                  marketData.prices.no.mid ||
                                  currentPrice;
                              } else if (marketData.prices.NO) {
                                currentPrice =
                                  marketData.prices.NO.ask ||
                                  marketData.prices.NO.last ||
                                  marketData.prices.NO.mid ||
                                  currentPrice;
                              }
                            }
                          }

                          // Check for direct price fields as last resort
                          if (currentPrice === 0.5 || !currentPrice) {
                            currentPrice =
                              marketData.current_price ||
                              marketData.last_price ||
                              marketData.lastPrice ||
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
    router.push("/groups");
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Logo />
              <div className="hidden sm:flex items-center gap-6">
                <a
                  href="#index-showcase"
                  className="text-sm font-medium text-gray-700 hover:text-primary transition"
                >
                  Explore
                </a>
                <a
                  href="/groups"
                  className="text-sm font-medium text-gray-700 hover:text-primary transition"
                >
                  Create
                </a>
                <a
                  href="/portfolio"
                  className="text-sm font-medium text-gray-700 hover:text-primary transition"
                >
                  Portfolio
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadGroups}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition disabled:opacity-50"
              >
                {loading ? (
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  "Refresh"
                )}
              </button>
              <button
                onClick={() => router.push("/groups")}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                Manage Indexes
              </button>
              {ready && !authenticated ? (
                <button
                  onClick={login}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-medium"
                >
                  Sign In
                </button>
              ) : ready && authenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {user?.email?.address ||
                      user?.wallet?.address?.slice(0, 6) + "..." ||
                      "Connected"}
                  </span>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2">
                  <svg
                    className="w-5 h-5 animate-spin text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

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
          fundAddresses={{
            // Map the first group to our test fund for demo purposes
            // In production, this would come from your database
            ...(groups[0]
              ? { [groups[0].id]: "0x8A136572B7b72AE8582cc49FEB231c4850FE8cD0" }
              : {}),
          }}
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
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              I am not sure yet{" "}
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Browse */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-secondary mb-2">
                Deposit
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Browse funds
              </h3>
              <p className="text-gray-600 text-sm">
                Select the group you lke and deposit USDC into the index
              </p>
            </div>

            {/* Step 2: Invest */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-xs font-semibold text-secondary mb-2">
                Monitor
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Deposit USDC
              </h3>
              <p className="text-gray-600 text-sm">
                One-click investment gets you automatic exposure to all markets
                in the fund
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
                Monitor real-time performance and withdraw your funds anytime
                after markets resolve
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
