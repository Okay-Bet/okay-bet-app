"use client";

import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useGroupedMarkets } from "@/hooks/useGroupedMarkets";
import { GroupedMarketCard } from "./GroupedMarketCard";
import { BetSlip } from "../Bet/BetSlip";
import ConnectWallet from "../User/ConnectWallet";
import Pitch from "../Landing/Pitch";
import Testimonials from "../Landing/Testimonials";

const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    <p className="ml-3 text-gray-600">Loading markets data...</p>
  </div>
);

const PredictionMarkets = () => {
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="ml-3 text-gray-600">Initializing...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <ConnectWallet />
        <Pitch />
        <Testimonials />
      </>
    );
  }

  return <AuthenticatedMarketsView />;
};

const AuthenticatedMarketsView = () => {
  const { groupedMarkets, loading, error, hasMore, loadMore, page } =
    useGroupedMarkets();

  if (error) {
    return (
      <div className="text-center text-red-500 py-4 min-h-[200px] flex flex-col items-center justify-center">
        <p className="text-lg font-semibold">Error loading markets</p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={() => loadMore(1)}
          className="mt-4 px-4 py-2 bg-accent-gray-800 text-white rounded hover:bg-accent-gray-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <ConnectWallet />

      {loading && groupedMarkets.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedMarkets.map((groupedMarket) => (
              <GroupedMarketCard
                key={groupedMarket.id}
                groupedMarket={groupedMarket}
              />
            ))}
          </div>

          <div className="flex justify-center my-6">
            {hasMore && (
              <button
                onClick={() => loadMore(page + 1)}
                className="px-8 py-3 bg-accent-gray-800 text-white rounded hover:bg-accent-gray-700 disabled:opacity-50 transition-colors shadow-sharp flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            )}
          </div>
        </>
      )}

      <BetSlip />
      <Testimonials />
    </div>
  );
};

export default React.memo(PredictionMarkets);
