// app/page.tsx
// landing page of the app

"use client";
import React from "react";
import { useActiveAccount } from "thirdweb/react";
import Image from "next/image";
import logo from "../../public/okay_bet.png";
import Pitch from "@/components/Landing/Pitch";
import ConnectWallet from "@/components/User/ConnectWallet";
import { BetSlipProvider } from "./context/BetSlipContext";
import { BetSlip } from "@/components/Bet/BetSlip";
import PredictionMarkets from "@/components/Polymarket/PredictionMarkets";
import Testimonials from "@/components/Landing/Testimonials";
import UserPositions from "@/components/User/UserPositions";


export default function Home() {
  const account = useActiveAccount();

  return (
    <main className=" width-full flex-col items-center justify-center">
      <div className="py-10 text-center">
        <div className="m-3">
          <Image
            src={logo}
            alt="Okay Bet Logo"
            width={400}
            height={150}
            className="mx-auto mb-10"
            onClick={() => window.location.reload()}
            priority
          />
        </div>
        <ConnectWallet />
        {account ? (
          <div className="w-full">
        <main className="mt-8 mb-4">
          <BetSlipProvider>
            <UserPositions />
            <PredictionMarkets/>
            <BetSlip />
          </BetSlipProvider>
        </main>
        <Testimonials />
        </div>
        ) : (
          <Pitch />
        )}
      </div>
    </main>
  );
}

