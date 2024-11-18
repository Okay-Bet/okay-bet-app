// src/app/context/BetSlipContext.tsx
import React, { createContext, useContext, useState } from "react";

export interface Bet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
}

interface BetSlipContextType {
  bet: Bet | null; // Changed from bets array to single bet
  addBet: (bet: Bet) => void;
  removeBet: (marketId: string) => void;
  clearBets: () => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const BetSlipProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [bet, setBet] = useState<Bet | null>(null); // Changed from array to single bet

  const addBet = (newBet: Bet) => {
    setBet(newBet); // Simply replace the existing bet
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
