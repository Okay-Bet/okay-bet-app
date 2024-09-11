"use client";
import React, { useState } from "react";
import IosShareIcon from "@mui/icons-material/IosShare";
import { ethers } from "ethers";
import { formatCurrency, convertEthToUsd } from "@/utils/currencyUtils";

interface ShareButtonProps {
  makerDisplay: string;
  takerDisplay: string;
  judgeDisplay: string;
  wager: string;
  isUsdcBet: boolean;
  status: number;
  conditions: string;
  ethToUsdRate: number;
  address: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  makerDisplay,
  takerDisplay,
  judgeDisplay,
  wager,
  isUsdcBet,
  status,
  conditions,
  ethToUsdRate,
  address,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const shortenAddress = (address: string | undefined) =>
    address && address.startsWith("0x")
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address || "Unknown";

  const getWagerText = () => {
    if (isUsdcBet) {
      try {
        const wagerUsdc = ethers.utils.formatUnits(wager, 6);
        return `$${parseFloat(wagerUsdc).toFixed(2)}`;
      } catch (error) {
        console.error("Error calculating USDC wager:", error);
        return "Error calculating wager";
      }
    } else {
      try {
        const wagerEth = ethers.utils.formatEther(wager);
        const wagerUsd = convertEthToUsd(wagerEth, ethToUsdRate);
        return `${wagerUsd} (${formatCurrency(wagerEth, "ETH")})`;
      } catch (error) {
        console.error("Error calculating ETH wager:", error);
        return "Error calculating wager";
      }
    }
  };

  const statusText =
    status === 3 ? "Resolved" : status === 4 ? "Invalidated" : "Open";

  const shareText = `Okay Bet Alert
Conditions: ${conditions || "N/A"}
Maker: ${shortenAddress(makerDisplay)}
Taker: ${shortenAddress(takerDisplay)}
Judge: ${shortenAddress(judgeDisplay)}
Wager: ${getWagerText()}
Status: ${statusText}
${address ? `https://www.okaybet.fun/bet/${address}` : "URL not available"}
`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Okay Bet",
          text: shareText,
        });
      } catch (error) {
        console.error("Error sharing", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy: ", error);
      }
    }
  };

  return (
    <div className="flex items-center">
      {isCopied && (
        <p className="mt-1 mr-2 text-font">Copied! Paste in your groupchat</p>
      )}
      <IosShareIcon
        onClick={handleShare}
        className="text-primary hover:text-quaternary cursor-pointer"
      />
    </div>
  );
};

export default ShareButton;