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

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          <span className="block font-semibold">Bettor 1:</span>
          <span>
            {bet.better1Display.endsWith(".eth")
              ? bet.better1Display
              : shortenAddress(bet.better1Display)}
          </span>
        </div>
        <div>
          <span className="block font-semibold">Bettor 2:</span>
          <span>
            {bet.better2Display.endsWith(".eth")
              ? bet.better2Display
              : shortenAddress(bet.better2Display)}
          </span>
        </div>
      </div>
      <div className="flex justify-between mb-4">
        <div>
          <span className="block font-semibold">Judge:</span>
          <span>
            {bet.deciderDisplay.endsWith(".eth")
              ? bet.deciderDisplay
              : shortenAddress(bet.deciderDisplay)}
          </span>
        </div>
        <div>
          <span className="block font-semibold">Wager:</span>
          <span>
            ${wagerInUsd} USD ({bet.wagerEth} ETH)
          </span>
        </div>
      </div>
      <div className="flex justify-between mb-4">
        <div>
          <span className="block font-semibold">Status:</span>
          <span>{bet.status === 4 ? "Resolved" : "Invalidated"}</span>
        </div>
        <div>
          <span className="block font-semibold">Winner:</span>
          <span>
            {bet.winnerDisplay
              ? bet.winnerDisplay.endsWith(".eth")
                ? bet.winnerDisplay
                : shortenAddress(bet.winnerDisplay)
              : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BetDetails;
