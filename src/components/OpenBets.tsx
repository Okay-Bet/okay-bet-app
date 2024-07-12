// components/OpenBets.js
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSendTransaction } from "thirdweb/react";
import { getContract } from "thirdweb";
import { ethers } from "ethers";
import { client, contract } from "@/app/client";
import { bet, resolveBet, invalidateBet } from "../generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { Collapse } from "@mui/material";
import AlertModal from "./AlertModal";
import ShareButton from "./ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import QrCodeIcon from "@mui/icons-material/QrCode";

interface OpenBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

const OpenBets: React.FC<OpenBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const [betDetails, setBetDetails] = useState<any[]>([]);
  const address = accountAddress.toLowerCase();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);

  const fetchEthToUsdRate = async () => {
    try {
      const response = await fetch(
        "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
      );
      const data = await response.json();
      setEthToUsdRate(data.USD);
    } catch (error) {
      console.error("Error fetching ETH to USD rate:", error);
    }
  };

  const fetchBetDetails = async () => {
    const details: any[] = [];

    for (const betAddress of betAddresses) {
      try {
        const betContract = getContract({
          client,
          address: betAddress,
          chain: contract.chain,
        });

        const betData = await bet({ contract: betContract });

        if (betData) {
          const [better1, better2, decider] = await Promise.all([
            resolveName({ client, address: betData[0] }).catch(() => null),
            resolveName({ client, address: betData[1] }).catch(() => null),
            resolveName({ client, address: betData[2] }).catch(() => null),
          ]);

          details.push({
            address: betAddress,
            better1: betData[0],
            better1Display: better1 || betData[0],
            better2: betData[1],
            better2Display: better2 || betData[1],
            decider: betData[2],
            deciderDisplay: decider || betData[2],
            wagerWei: betData[3].toString(),
            wagerEth: parseFloat(ethers.utils.formatEther(betData[3])).toFixed(
              4
            ), // Rounded to 4 decimals
            conditions: betData[4],
            status: betData[5],
          });
        }
      } catch (error) {
        console.error(`Error fetching bet details for ${betAddress}:`, error);
      }
    }

    setBetDetails(details);
  };

  useEffect(() => {
    fetchEthToUsdRate();
  }, []);

  useEffect(() => {
    fetchBetDetails();
  }, [betAddresses, address]);

  const handleResolveBet = async (
    betAddress: string,
    winnerAddress: string
  ) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      // Ensure the winnerAddress is a valid Ethereum address
      const formattedWinnerAddress = ethers.utils.getAddress(
        winnerAddress
      ) as `0x${string}`;

      const transaction = resolveBet({
        contract: betContract,
        winner: formattedWinnerAddress,
      });

      await sendTransaction(transaction);
      setMessage("Bet resolved successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error resolving bet:", error);
      if (isError(error)) {
        setMessage(
          `Error resolving bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          `Error resolving bet. Please try again. An unexpected error occurred.`
        );
      }
      setIsAlertOpen(true);
    }
  };

  const handleInvalidateBet = async (betAddress: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const transaction = invalidateBet({
        contract: betContract,
      });

      await sendTransaction(transaction);
      setMessage("Bet invalidated successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error invalidating bet:", error);
      if (isError(error)) {
        setMessage(
          `Error invalidating bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          `Error invalidating bet. Please try again. An unexpected error occurred.`
        );
      }
      setIsAlertOpen(true);
    }
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary font-bold">
      <h3
        className="text-lg italic mb-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        Active Bets
      </h3>
      <Collapse in={isOpen}>
        {betDetails.map((bet, index) => {
          const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(
            2
          );

          return (
            <div key={index} className="p-6 mb-6 bg-secondary shadow-md">
              <h4 className="text-xl font-bold mb-4 text-font">
                {bet.conditions}
              </h4>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="p-4 bg-tertiary text-font rounded-lg shadow-sm">
                  <span>
                    Better 1:{" "}
                    {bet.better1Display.endsWith(".eth")
                      ? bet.better1Display
                      : shortenAddress(bet.better1Display)}
                  </span>
                </div>
                <div className="p-4 bg-tertiary text-font rounded-lg shadow-sm">
                  <span>
                    Better 2:{" "}
                    {bet.better2Display.endsWith(".eth")
                      ? bet.better2Display
                      : shortenAddress(bet.better2Display)}
                  </span>
                </div>
                <div className="p-4 bg-tertiary text-font rounded-lg shadow-sm">
                  <span>
                    Decider:{" "}
                    {bet.deciderDisplay.endsWith(".eth")
                      ? bet.deciderDisplay
                      : shortenAddress(bet.deciderDisplay)}
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-blue-500 text-white rounded-full">
                  ${wagerInUsd} USD ({bet.wagerEth} ETH)
                </span>
              </div>
              {address === bet.decider.toLowerCase() ? (
                <div>
                  <button
                    onClick={() => handleResolveBet(bet.address, bet.better1)}
                    className="w-full p-2 bg-green-500 text-font font-heading mt-2 hover:bg-tertiary hover:italic  transition-colors"
                  >
                    Declare Better 1 as Winner
                  </button>
                  <button
                    onClick={() => handleResolveBet(bet.address, bet.better2)}
                    className="w-full p-2 bg-green-500 text-font font-heading mt-2 hover:bg-tertiary hover:italic transition-colors"
                  >
                    Declare Better 2 as Winner
                  </button>
                  <button
                    onClick={() => handleInvalidateBet(bet.address)}
                    className="w-full p-2 bg-primary text-font font-heading mt-2 hover:bg-tertiary hover:italic transition-colors"
                  >
                    Cancel Bet
                  </button>
                </div>
              ) : (
                <p className="text-font mb-4 mt-4 text-lg text-bold text-center italic">
                  Waiting for decider to pick a winner
                </p>
              )}
              <div className="flex justify-end items-center space-x-4 mt-4">
                <ShareButton
                  better1Display={bet.better1Display}
                  better2Display={bet.better2Display}
                  deciderDisplay={bet.deciderDisplay}
                  wagerEth={bet.wagerEth}
                  status={bet.status}
                  conditions={bet.conditions}
                  ethToUsdRate={ethToUsdRate}
                  address={bet.address}
                />
                <Link href={`/bet/${bet.address}`} passHref legacyBehavior>
                  <a className="text-primary hover:text-quaternary cursor-pointer mt-1">
                    <OpenInNewIcon />
                  </a>
                </Link>
              </div>
            </div>
          );
        })}
      </Collapse>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />
    </div>
  );
};

export default OpenBets;
