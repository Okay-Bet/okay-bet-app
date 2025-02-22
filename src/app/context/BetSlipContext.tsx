import React, { createContext, useContext, useState, useCallback } from "react";

// Base bet interface with common properties
export interface BaseBet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
  groupId: string;
}

// Limitless specific bet interface
export interface LimitlessBet extends BaseBet {
  provider: "LIMITLESS";
  tokenId: string;
}

// Polymarket specific bet interface
export interface PolymarketBet extends BaseBet {
  provider: "POLYMARKET";
  slug: string;
}

// Union type for all possible bet types
export type Bet = LimitlessBet | PolymarketBet;

interface BetSlipContextType {
  bets: Bet[];
  addBet: (bet: Bet) => void;
  removeBet: (marketId: string) => void;
  clearBets: () => void;
  isParlay: boolean;
  parleyOdds: number;
  getEstimatedPayout: (amount: string) => number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const BetSlipProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bets, setBets] = useState<Bet[]>([]);

  // Calculate parlay odds with 20% discount
  const calculateParleyOdds = useCallback(() => {
    if (bets.length === 0) return 0;
    if (bets.length === 1) return bets[0].price;

    // Multiply all probabilities together
    const combinedProbability = bets.reduce((acc, bet) => acc * bet.price, 1);
    const rawOdds = 1 / combinedProbability;
    return rawOdds * 0.8; // 20% discount
  }, [bets]);

  // Calculate estimated payout based on amount
  const getEstimatedPayout = useCallback(
    (amount: string) => {
      if (!amount || isNaN(parseFloat(amount))) return 0;
      return parseFloat(amount) * calculateParleyOdds();
    },
    [calculateParleyOdds]
  );

  // Determine if it's a parlay
  const isParlay = bets.length > 1;

  // Calculate odds whenever bets change
  const parleyOdds = calculateParleyOdds();

  const addBet = useCallback((newBet: Bet) => {
    setBets((currentBets) => {
      // Check for duplicate groupId
      const hasCorrelatedMarket = currentBets.some(
        (existingBet) => existingBet.groupId === newBet.groupId
      );

      if (hasCorrelatedMarket) {
        console.error("Cannot add correlated markets to parlay");
        return currentBets;
      }

      // Validate other bet properties
      if (newBet.provider === "LIMITLESS") {
        if (!newBet.tokenId || !newBet.tokenId.startsWith("0x")) {
          console.error("Invalid tokenId:", newBet.tokenId);
          return currentBets;
        }
      } else if (newBet.provider === "POLYMARKET") {
        if (!newBet.slug) {
          console.error("Invalid Polymarket slug:", newBet.slug);
          return currentBets;
        }
      }

      // Validate price
      if (isNaN(newBet.price) || newBet.price <= 0 || newBet.price > 1) {
        console.error("Invalid price value:", newBet.price);
        return currentBets;
      }

      // Cap the maximum number of bets in a parlay
      if (currentBets.length >= 5) {
        console.error("Maximum parlay size reached (5 bets)");
        return currentBets;
      }

      return [...currentBets, newBet];
    });
  }, []);

  const removeBet = useCallback((marketId: string) => {
    setBets((currentBets) =>
      currentBets.filter((bet) => bet.marketId !== marketId)
    );
  }, []);

  const clearBets = useCallback(() => {
    setBets([]);
  }, []);

  const value = React.useMemo(
    () => ({
      bets,
      addBet,
      removeBet,
      clearBets,
      isParlay,
      parleyOdds,
      getEstimatedPayout,
    }),
    [bets, addBet, removeBet, clearBets, parleyOdds, getEstimatedPayout]
  );

  return (
    <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>
  );
};

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error("useBetSlip must be used within a BetSlipProvider");
  }
  return context;
};
