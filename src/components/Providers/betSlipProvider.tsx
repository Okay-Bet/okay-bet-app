"use client";

import { BetSlipProvider } from "@/app/context/BetSlipContext";

export default function BetSlipProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BetSlipProvider>
      {children}
    </BetSlipProvider>
  );
}