// components/UnfundedBets.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSendTransaction } from "thirdweb/react";
import { getContract } from "thirdweb";
import { ethers } from "ethers";
import { client, contract } from "@/app/client";
import { bet, fundBet, cancelBet } from "../generated/bet";
import { resolveName } from "thirdweb/extensions/ens";
import { Collapse } from "@mui/material";
import AlertModal from "./AlertModal";
import ShareButton from "./ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface UnfundedBetsProps {
  betAddresses: string[];
  accountAddress: string;
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

const UnfundedBets: React.FC<UnfundedBetsProps> = ({
  betAddresses,
  accountAddress,
}) => {
  const [betDetails, setBetDetails] = useState<any[]>([]);
  const [ethToUsdRate, setEthToUsdRate] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const address = accountAddress.toLowerCase();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [message, setMessage] = useState<string>("");
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  useEffect(() => {
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

    fetchEthToUsdRate();
  }, []);

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

        if (
          betData &&
          (betData[5] === 0 || betData[5] === 1 || betData[5] === 2)
        ) {
          // 0 for Unfunded, 1 for Better1Funded, 2 for Better2Funded
          const [better1, better2, decider] = [
            betData[0],
            betData[1],
            betData[2],
          ];
          const [better1ens, better2ens, deciderens] = await Promise.all([
            resolveName({ client, address: betData[0] }).catch(() => null),
            resolveName({ client, address: betData[1] }).catch(() => null),
            resolveName({ client, address: betData[2] }).catch(() => null),
          ]);
          details.push({
            address: betAddress,
            better1: better1,
            better1Display: better1ens || better1,
            better2: better2,
            better2Display: better2ens || better2,
            decider: decider,
            deciderDisplay: deciderens || decider,
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
    fetchBetDetails();
  }, [betAddresses, address]);

  const handleFundBet = async (betAddress: string, wagerWei: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const transaction = fundBet({
        contract: betContract,
      });

      // Convert wagerWei to bigint
      const wagerWeiBigInt = BigInt(wagerWei);

      await sendTransaction({ ...transaction, value: wagerWeiBigInt });
      setMessage("Bet funded successfully!");
      setIsAlertOpen(true);
      fetchBetDetails();
    } catch (error: unknown) {
      console.error("Error funding bet:", error);
      if (error instanceof Error) {
        setMessage(
          `Error funding bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          `Error funding bet. Please try again. An unexpected error occurred.`
        );
      }
      setIsAlertOpen(true);
    }
  };

  const handleCancelBet = async (betAddress: string) => {
    try {
      const betContract = getContract({
        client,
        address: betAddress,
        chain: contract.chain,
      });

      const transaction = cancelBet({
        contract: betContract,
      });

      await sendTransaction(transaction);
      setMessage("Bet canceled successfully!");
      setIsAlertOpen(true);
      fetchBetDetails(); // Refresh bet details
    } catch (error: unknown) {
      console.error("Error canceling bet:", error);
      if (error instanceof Error) {
        setMessage(
          `Error canceling bet. Please try again. Details: ${error.message}`
        );
      } else {
        setMessage(
          `Error canceling bet. Please try again. An unexpected error occurred.`
        );
      }
      setIsAlertOpen(true);
    }
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const getBetStatusText = (
    status: number,
    better1: string,
    better2: string
  ) => {
    switch (status) {
      case 0:
        return "Unfunded";
      case 1:
        return `Partially Funded (${better1} has funded)`;
      case 2:
        return `Partially Funded (${better2} has funded)`;
      default:
        return "Unknown Status";
    }
  };

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary">
      <h3
        className="text-lg font-bold mb-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        Unfunded Bets
      </h3>
      <Collapse in={isOpen}>
        {betDetails.map((bet, index) => {
          const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(
            2
          );
          const canFund =
            (address === bet.better1.toLowerCase() && bet.status !== 1) ||
            (address === bet.better2.toLowerCase() && bet.status !== 2);

          return (
            <div key={index} className="p-4 mb-4 bg-secondary">
              <h4 className="text-xl font-bold mb-2 text-font">
                {bet.conditions}
              </h4>
              <div className="grid grid-cols-1 gap-4 mb-2">
                <div className="p-4 bg-tertiary text-font shadow-md">
                  <span>
                    Better 1:{" "}
                    {bet.better1Display.endsWith(".eth")
                      ? bet.better1Display
                      : shortenAddress(bet.better1Display)}
                  </span>
                </div>
                <div className="p-4 bg-tertiary text-font  shadow-md">
                  <span>
                    Better 2:{" "}
                    {bet.better2Display.endsWith(".eth")
                      ? bet.better2Display
                      : shortenAddress(bet.better2Display)}
                  </span>
                </div>
                <div className="p-4 bg-tertiary text-font  shadow-md">
                  <span>
                    Decider:{" "}
                    {bet.deciderDisplay.endsWith(".eth")
                      ? bet.deciderDisplay
                      : shortenAddress(bet.deciderDisplay)}
                  </span>
                </div>
              </div>
              <div className="inline-block px-4 py-2 bg-blue-500 text-font rounded-full">
                ${wagerInUsd} USD ({bet.wagerEth} ETH)
              </div>
              <div className="mb-2 mt-2">
                <span className="inline-block px-4 py-2 bg-tertiary text-font">
                  {getBetStatusText(
                    bet.status,
                    bet.better1Display.endsWith(".eth")
                      ? bet.better1Display
                      : shortenAddress(bet.better1Display),
                    bet.better2Display.endsWith(".eth")
                      ? bet.better2Display
                      : shortenAddress(bet.better2Display)
                  )}
                </span>
              </div>
              {canFund ? (
                <button
                  onClick={() => handleFundBet(bet.address, bet.wagerWei)}
                  className="w-full p-2 bg-green-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
                >
                  Fund Bet
                </button>
              ) : address === bet.decider.toLowerCase() ? (
                <p className="text-font">You are the decider for this bet.</p>
              ) : (
                <p className="text-font">You have already funded this bet.</p>
              )}
              <button
                onClick={() => handleCancelBet(bet.address)}
                className="w-full p-2 mb-2 bg-red-500 text-font font-heading rounded-lg mt-2 hover:bg-tertiary hover:italic transition-colors"
              >
                Cancel Bet
              </button>
              <div className="flex justify-end items-center space-x-4 mt-2">
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

export default UnfundedBets;
