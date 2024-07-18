"use client";

import { useActiveAccount } from "thirdweb/react";
import { ThirdwebProvider } from "thirdweb/react";
import { client, contract } from "./client";
import CreateBetForm from "../components/CreateBetForm/CreateBetForm";
import BetList from "../components/BetList";
import Image from "next/image";
import logo from "@public/okay_bet.png";
import Pitch from "@/components/Landing/Pitch";
import ConnectWallet from "@/components/User/ConnectWallet";

export default function Home() {
  const account = useActiveAccount();

  return (
    <ThirdwebProvider>
      <main className="min-h-screen flex flex-col items-center justify-center">
        <div className="py-10 text-center">
          <div className="m-3">
            <Image
              src={logo}
              alt="Okay Bet Logo"
              width={400}
              height={150}
              className="mx-auto mb-10"
              onClick={() => window.location.reload()}
            />
          </div>

          <ConnectWallet />

          {account ? (
            <div>
              <CreateBetForm contract={contract} />
              <BetList contract={contract} accountAddress={account.address} />
            </div>
          ) : (
            <Pitch />
          )}
        </div>
      </main>
    </ThirdwebProvider>
  );
}
