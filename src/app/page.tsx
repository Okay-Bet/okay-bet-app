"use client";

import { useActiveAccount } from "thirdweb/react";
import { ThirdwebProvider } from "thirdweb/react";
import { client, contract } from "./client";
import CreateBetForm from "../components/CreateBetForm";
import BetList from "../components/BetList";
import Image from "next/image";
import logo from "@public/okay_bet.png";
import FAQ from "@/components/FAQ";
import ConnectWallet from "@/components/ConnectWallet";

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

function Pitch() {
  return (
    <div>
      <section className="flex flex-col items-center justify-center w-full bg-secondary p-10 text-center">
        <h1 className="text-3xl md:text-4xl font-heading text-quaternary tracking-tighter italic mb-4">
          GAMBLING FOR YOUR GROUPCHAT
        </h1>
        <p className="text-lg md:text-xl text-quaternary mb-8">
          Make a bet on anything you can think of with your friend and have the winner decided by another friend.
        </p>

        <h1 className="text-3xl md:text-4xl font-heading text-font tracking-tighter italic mb-10">
          HOW IT WORKS
        </h1>
        <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-8 mb-8">
          <div className="text-center">
            <img
              src="/better1.png"
              alt="Better 1"
              className="w-32 h-32  mx-auto mb-2"
            />
            <p className="text-lg md:text-xl font-bold text-font">Better 1</p>
            <p className=" md:text-base text-font">
              Creates the bet, selects who they are betting against and who decides it.
            </p>
          </div>
          <div className="text-center">
            <img
              src="/better2.png"
              alt="Better 2"
              className="w-32 h-32  mx-auto mb-2"
            />
            <p className="text-lg md:text-xl font-bold text-font">Better 2</p>
            <p className=" md:text-base text-font">
              Accepts the terms and funds their side of it or rejects the bet.
            </p>
          </div>
          <div className="text-center">
            <img
              src="/decider.png"
              alt="Decider"
              className="w-32 h-32  mx-auto mb-2"
            />
            <p className="text-lg md:text-xl font-bold text-font">Decider</p>
            <p className=" md:text-base text-font">
              Chooses who wins the bet, or if it should be cancelled and refunded.
            </p>
          </div>
        </div>
      </section>
      <FAQ />
    </div>
  );
}
