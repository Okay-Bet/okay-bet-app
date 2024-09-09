import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { BASE_MAINNET_RPC } from "@/constants/rpc";

const BET_ADDRESS = "0x07d0ba3db4253cc3f084a472488db9f7c420688b"; // Replace with your actual bet address
const BET_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "bettor",
        type: "address",
      },
    ],
    name: "getWagerAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBetDetails",
    outputs: [
      {
        internalType: "address",
        name: "maker",
        type: "address",
      },
      {
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        internalType: "address",
        name: "judge",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "totalWager",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "wagerRatio",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "conditions",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "winner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "expirationBlock",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "finalized",
        type: "bool",
      },
      {
        internalType: "address",
        name: "wagerCurrency",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
interface BetDetails {
  maker: string;
  taker: string;
  totalWager: string;
  wagerRatio: number;
  status: number;
  finalized: boolean;
  wagerCurrency: string;
}

const WagerAmountReader = () => {
  const [betDetails, setBetDetails] = useState<BetDetails | null>(null);
  const [makerWager, setMakerWager] = useState<string | null>(null);
  const [takerWager, setTakerWager] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBetDetails = async () => {
      try {
        // Connect to the Base network
        const provider = new ethers.providers.JsonRpcProvider(BASE_MAINNET_RPC);

        // Create a contract instance
        const betContract = new ethers.Contract(BET_ADDRESS, BET_ABI, provider);

        // Fetch bet details
        const details = await betContract.getBetDetails();
        setBetDetails({
          maker: details[0],
          taker: details[1],
          totalWager: ethers.utils.formatEther(details[3]),
          wagerRatio: details[4].toNumber() / 100, // Assuming wagerRatio is in basis points
          status: details[6],
          finalized: details[9],
          wagerCurrency: details[10],
        });

        // Get wager amounts
        const makerAmount = await betContract.getWagerAmount(details[0]);
        const takerAmount = await betContract.getWagerAmount(details[1]);

        setMakerWager(ethers.utils.formatEther(makerAmount));
        setTakerWager(ethers.utils.formatEther(takerAmount));
      } catch (err) {
        console.error("Error fetching bet details:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchBetDetails();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!betDetails) {
    return <div>Loading bet details...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Bet Details: {BET_ADDRESS}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p>
            <strong>Maker:</strong> {betDetails.maker}
          </p>
          <p>
            <strong>Taker:</strong> {betDetails.taker}
          </p>
          <p>
            <strong>Total Wager:</strong> {betDetails.totalWager} ETH
          </p>
          <p>
            <strong>Wager Ratio:</strong> {betDetails.wagerRatio}%
          </p>
        </div>
        <div>
          <p>
            <strong>Status:</strong> {betDetails.status}
          </p>
          <p>
            <strong>Finalized:</strong> {betDetails.finalized ? "Yes" : "No"}
          </p>
          <p>
            <strong>Wager Currency:</strong>{" "}
            {betDetails.wagerCurrency === ethers.constants.AddressZero
              ? "ETH"
              : betDetails.wagerCurrency}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Wager Amounts:</h3>
        <p>
          <strong>Maker&apos;s Wager:</strong>{" "}
          {makerWager ? `${makerWager} ETH` : "Loading..."}
        </p>
        <p>
          <strong>Taker&apos;s Wager:</strong>{" "}
          {takerWager ? `${takerWager} ETH` : "Loading..."}
        </p>
      </div>
    </div>
  );
};

export default WagerAmountReader;
