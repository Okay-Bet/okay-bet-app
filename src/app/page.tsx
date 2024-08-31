// app/page.tsx
"use client";
import React, { Suspense } from "react";
import { useActiveAccount } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Image from "next/image";
import logo from "@public/okay_bet.png";
import CreateBetForm from "../components/CreateBetForm/CreateBetForm";
import OpenBets from "../components/Bet/OpenBets";
import UnfundedBets from "../components/Bet/UnfundedBets";
import Pitch from "@/components/Landing/Pitch";
import ConnectWallet from "@/components/User/ConnectWallet";
import Username from "@/components/User/Username";
import { useBetList } from "@/hooks/useBetList";
import { contract } from "./client";
import BetHistory from "@/components/Metrics/BetHistory";
import Testimonials from "@/components/Landing/Testimonials";
import ContractEvents from './events';
import dynamic from 'next/dynamic';

const PushNotificationSubscriber = dynamic(
  () => import('@/components/Notifications/PushNotificationSubscriber'),
  { ssr: false }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function HomeContent() {
  const account = useActiveAccount();
  const { openBets, unfundedBets, betHistory, isLoading } = useBetList({
    accountAddress: account?.address || "",
  });

  return (
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
        <Username />
        <Suspense fallback={<div>Loading push notification component...</div>}>
          <PushNotificationSubscriber />
        </Suspense>
        {account ? (
          <div className="w-full max-w-md mx-auto">
            <CreateBetForm contract={contract} />
            {isLoading ? (
              <p>Loading...</p>
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
                <BetHistory
                  betAddresses={betHistory}
                  accountAddress={account.address}
                />
                <Testimonials />
                <ContractEvents />
              </div>
            )}
          </div>
        ) : (
          <Pitch />
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomeContent />
    </QueryClientProvider>
  );
}
