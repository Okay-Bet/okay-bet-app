import React, { createContext, useContext, useState, useCallback } from "react";

export interface Bet {
  marketId: string;
  eventTitle: string;
  marketQuestion: string;
  position: "YES" | "NO";
  price: number;
  tokenId: string;
  provider?: "LIMITLESS";
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

  const addBet = useCallback((newBet: Bet) => {
    if (!newBet.tokenId || !newBet.tokenId.startsWith('0x')) {
      console.error('Invalid tokenId (FPMM address):', newBet.tokenId);
      return;
    }
    // Validate the price format before setting
    const validatedBet = {
      ...newBet,
      price: Number(newBet.price),
    };

    // Validate required fields
    const requiredFields: (keyof Bet)[] = [
      "marketId",
      "eventTitle",
      "marketQuestion",
      "position",
      "price",
      "tokenId",
    ];

    const missingFields = requiredFields.filter(
      (field) => !validatedBet[field]
    );

    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return;
    }

    // Validate price is a number and within valid range
    if (
      isNaN(validatedBet.price) ||
      validatedBet.price <= 0 ||
      validatedBet.price > 1
    ) {
      console.error("Invalid price value:", validatedBet.price);
      return;
    }

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
