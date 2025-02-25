// app/page.tsx
// landing page of the app

"use client";
import React from "react";
import Image from "next/image";
import logo from "../../public/okay_bet.png";
import ConnectButton from "../components/User/ConnectButton";
import { BetSlipProvider } from "./context/BetSlipContext";
import { BetSlip } from "../components/Bet/BetSlip";
import PredictionMarkets from "../components/Markets/PredictionMarkets";
import Testimonials from "../components/Landing/Testimonials";
import InvestComponent from "@/components/starknet/InvestComponent";
// import UserPositions from "../components/User/UserPositions";


export default function Home() {

  return (
    <main className=" width-full flex-col items-center justify-center">
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
        <ConnectButton />
        <InvestComponent />
          <div className="w-full">
        <main className="mt-8 mb-4">
          <BetSlipProvider>
            {/* <UserPositions /> */}
            <PredictionMarkets/>
            <BetSlip />
          </BetSlipProvider>
        </main>
        <Testimonials />
        </div>
          {/* <Pitch /> */}
      </div>
    </main>
  );
}

