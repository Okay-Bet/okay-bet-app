"use client";
import React from "react";
import PredictionMarkets from "@/components/Polymarket/PredictionMarkets";
import Image from "next/image";
import logo from "@public/okay_bet.png";
import ConnectWallet from "@/components/User/ConnectWallet";
import { BetSlipProvider } from "../context/BetSlipContext";
import { BetSlip } from "../../components/Bet/BetSlip";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-3 items-center border-b border-gray-700">
          <div className="col-start-1">
            <Image
              src={logo}
              alt="Okay Bet Logo"
              width={200}
              height={75}
              className="cursor-pointer"
              onClick={() => window.location.reload()}
              priority
            />
          </div>
          <div className="col-start-2 justify-self-center mt-8">
            <ConnectWallet />
          </div>
        </div>

        <main className="mt-8">
          <BetSlipProvider >
          <PredictionMarkets
            searchParams={{
              limit: 50,
              active: true,
              liquidity_num_min: 1000,
            }}
          />
          <BetSlip />
          </BetSlipProvider>

        </main>
      </div>
    </div>
  );
}
