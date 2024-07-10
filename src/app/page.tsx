"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { ThirdwebProvider } from "thirdweb/react";
import { client, contract } from "./client";
import CreateBetForm from "../components/CreateBetForm";
import BetList from "../components/BetList";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { baseSepolia, defineChain } from "thirdweb/chains";
import Image from "next/image";
import logo from "@public/bets.png";

export default function Home() {
  const account = useActiveAccount();
  const wallets = [
    createWallet("com.coinbase.wallet"),
    inAppWallet({
      auth: {
        options: [
          "google",
          "facebook",
          "apple",
          "phone",
          "email",
        ],
      },
    }),
  ];

  return (
    <ThirdwebProvider>
      <main className="p-4 pb-10 min-h-[100vh] flex items-center justify-center container max-w-screen-lg mx-auto">
        <div className="py-20 text-center">
          <Image
            src={logo}
            alt="Bets with Friends"
            width={400}
            height={400}
            className="mx-auto mb-6"
          />

          <div className="flex justify-center mb-20 font-heading">
            <ConnectButton
              client={client}
              wallets={wallets}
              chain = {defineChain(baseSepolia)}
              theme={"dark"}
              connectModal={{ size: "wide" }}
              appMetadata={{
                name: "Bets with Friends",
                url: "https://betswithfriends.fun",
              }}
            />
          </div>

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

function Pitch() {
  return (
    <header className="flex flex-col items-center mb-20 md:mb-20">
      <div className="bg-tertiary bg-opacity-75 p-6 rounded-lg shadow-lg text-center max-w-xl">
        <h1 className="text-3xl md:text-4xl font-heading text-font tracking-tighter  mb-4">
          Connect your wallet to start betting with friends!
        </h1>
        <p className="text-lg md:text-xl text-font mb-2">
          Make a bet between you and a friend, then pick a decider that both of
          you trust!
        </p>
        <p className="text-lg md:text-xl text-font mb-2">
          Once each side pays the wager, the bet is on. Only the decider can
          pick a winner or cancel it to refund the betters.
        </p>
        <p className="text-lg md:text-xl text-font">
          The decider doesn&apos;t get any of the money. They can only decide
          where the money goes.
        </p>
      </div>
    </header>
  );
}
