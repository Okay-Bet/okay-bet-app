// src/app/context/BetSlipContext.tsx
// Context to manage the entering a new bet position

import React, { createContext, useContext, useState } from "react";

export interface Bet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
  tokenId: string;  // YES or NO token ID
}

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

  const addBet = (newBet: Bet) => {
    // Validate that we have a token ID
    if (!newBet.tokenId) {
      console.error("Attempted to add bet without token ID");
      return;
    }
    setBet(newBet);
  };

  const removeBet = (marketId: string) => {
    setBet(null);
  };

  const clearBets = () => setBet(null);

  return (
    <BetSlipContext.Provider value={{ bet, addBet, removeBet, clearBets }}>
      {children}
    </BetSlipContext.Provider>
  );
};

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (!context)
    throw new Error("useBetSlip must be used within a BetSlipProvider");
  return context;
};