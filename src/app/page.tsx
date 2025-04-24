"use client";
import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import logo from "../../public/okay_bet.png";
import Pitch from "../components/Landing/Pitch";
import ConnectWallet from "../components/User/ConnectWallet";
import { BetSlipProvider } from "./context/BetSlipContext";
import PredictionMarkets from "../components/Markets/PredictionMarkets";
import { UserPositions } from "../components/User/UserPositions";
import Testimonials from "../components/Landing/Testimonials";

export default function Home() {
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <main className="width-full flex-col items-center justify-center">
      <div className="py-6 text-center">
        <div className="m-3">
          <Image
            src={logo}
            alt="Okay Bet Logo"
            width={350}
            height={120}
            className="mx-auto mb-8"
            onClick={() => window.location.reload()}
            priority
          />
        </div>
        <ConnectWallet />
        {authenticated ? (
          <div className="w-full">
            <BetSlipProvider>
              <main className="mt-8 mb-4">
                {/* <UserPositions /> */}
                <PredictionMarkets />
              </main>
            </BetSlipProvider>
            <Testimonials />
          </div>
        ) : (
          <Pitch />
        )}
      </div>
    </main>
  );
}
