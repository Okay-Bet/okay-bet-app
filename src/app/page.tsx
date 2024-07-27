// app/page.tsx
"use client";
import React, { useState, lazy, Suspense } from "react";
import { useActiveAccount } from "thirdweb/react";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { client, contract } from "./client";
import CreateBetForm from "../components/CreateBetForm/CreateBetForm";
import OpenBets from "../components/Bet/OpenBets";
import UnfundedBets from "../components/Bet/UnfundedBets";
import Image from "next/image";
import logo from "@public/okay_bet.png";
import Pitch from "@/components/Landing/Pitch";
import ConnectWallet from "@/components/User/ConnectWallet";
import { useBetList } from "@/hooks/useBetList";

const BetHistory = lazy(() => import("../components/Metrics/BetHistory"));

export default function Home() {
  const account = useActiveAccount();
  const { openBets, unfundedBets, betHistory, isLoading } = useBetList({
    contract,
    accountAddress: account?.address || "",
  });

  return (
    <ThirdwebProvider clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}>
      <main className="min-h-screen width-full flex-col items-center justify-center max-w-4xl mx-auto px-4">
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
            <div className="w-full max-w-md mx-auto">
              <CreateBetForm contract={contract} />
              {isLoading ? (
                <p></p>
              ) : (
                <div>
                  <OpenBets
                    betAddresses={openBets}
                    accountAddress={account.address}
                  />
                  <UnfundedBets
                    betAddresses={unfundedBets}
                    accountAddress={account.address}
                  />
                  <Suspense>
                    <BetHistory
                      betAddresses={betHistory}
                      accountAddress={account.address}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          ) : (
            <Pitch />
          )}
        </div>
      </main>
    </ThirdwebProvider>
  );
}
