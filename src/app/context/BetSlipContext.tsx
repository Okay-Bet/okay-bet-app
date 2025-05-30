"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// Base bet interface with common properties
export interface BaseBet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
}

// Limitless specific bet interface
export interface LimitlessBet extends BaseBet {
  provider: "LIMITLESS";
  tokenId: string;
  marketSlug: string;
}

// Polymarket specific bet interface
export interface PolymarketBet extends BaseBet {
  provider: "POLYMARKET";
  slug: string;
}

// Kalshi specific bet interface
export interface KalshiBet extends BaseBet {
  provider: "KALSHI";
  ticker: string;
}

// Union type for all possible bet types
export type Bet = LimitlessBet | PolymarketBet | KalshiBet;

interface BetSlipContextType {
  bet: Bet | null;
  addBet: (bet: Bet) => void;
  removeBet: (marketId: string) => void;
  clearBets: () => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const BetSlipProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bet, setBet] = useState<Bet | null>(null);

  const addBet = useCallback((newBet: Bet) => {
    // Provider-specific validation
    if (newBet.provider === "LIMITLESS") {
      const limitlessBet = newBet as LimitlessBet;
      if (!limitlessBet.tokenId || !limitlessBet.tokenId.startsWith("0x")) {
        console.error("Invalid tokenId (FPMM address):", limitlessBet.tokenId);
        return;
      }
      if (!limitlessBet.marketSlug) {
        console.error("Missing market slug or URL for Limitless bet");
        return;
      }
    } else if (newBet.provider === "POLYMARKET") {
      if (!newBet.slug) {
        console.error("Missing slug for Polymarket bet");
        return;
      }
    }

    // Common validation
    const validatedBet = {
      ...newBet,
      price: Number(newBet.price),
    };

    // Validate price
    if (
      isNaN(validatedBet.price) ||
      validatedBet.price <= 0 ||
      validatedBet.price > 1
    ) {
      console.error("Invalid price value:", validatedBet.price);
      return;
    }

    // Validate required base fields
    const requiredFields: (keyof BaseBet)[] = [
      "marketId",
      "eventTitle",
      "marketQuestion",
      "position",
      "price",
    ];

    const missingFields = requiredFields.filter(
      (field) => !validatedBet[field]
    );

    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return;
    }

    console.log("Setting validated bet:", validatedBet); // Add debug logging
    setBet(validatedBet);
  }, []);

  const removeBet = useCallback((marketId: string) => {
    setBet(null);
  }, []);

  const clearBets = useCallback(() => {
    setBet(null);
  }, []);

  const value = React.useMemo(
    () => ({
      bet,
      addBet,
      removeBet,
      clearBets,
    }),
    [bet, addBet, removeBet, clearBets]
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
