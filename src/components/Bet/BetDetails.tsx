// components/Bet/BetDetails.tsx
import React from "react";

interface BetDetailsProps {
  bet: any;
  ethToUsdRate: number;
  address: string;
}

const BetDetails: React.FC<BetDetailsProps> = ({ bet, ethToUsdRate, address }) => {
  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;
  const wagerInUsd = (parseFloat(bet.wagerEth) * ethToUsdRate).toFixed(2);

  const displayName = (name: string) => {
    if (name.includes('.eth')) {
      return name;
    }
    if (name.startsWith('0x')) {
      return shortenAddress(name);
    }
    return name; // This will be the username
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          <span className="block font-semibold">Maker:</span>
          <span>{displayName(bet.better1Display)}</span>
        </div>
        <div>
          <span className="block font-semibold">Taker:</span>
          <span>{displayName(bet.better2Display)}</span>
        </div>
      </div>
      <div className="flex justify-between mb-4">
        <div>
          <span className="block font-semibold">Judge:</span>
          <span>{displayName(bet.deciderDisplay)}</span>
        </div>
        <div>
          <span className="block font-semibold">Wager:</span>
          <span>${wagerInUsd} USD ({bet.wagerEth} ETH)</span>
        </div>
      </div>
      <div className="flex justify-between mb-4">
        <div>
          <span className="block font-semibold">Status:</span>
          <span>{bet.status === 4 ? "Resolved" : "Invalidated"}</span>
        </div>
        <div>
          <span className="block font-semibold">Winner:</span>
          <span>{bet.winnerDisplay ? displayName(bet.winnerDisplay) : "N/A"}</span>
        </div>
      </div>
    </div>
  );
};

export default BetDetails;