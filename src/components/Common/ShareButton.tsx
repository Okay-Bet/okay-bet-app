"use client";
import React, { useState } from "react";
import IosShareIcon from "@mui/icons-material/IosShare";

interface ShareButtonProps {
  makerDisplay: string;
  takerDisplay: string;
  judgeDisplay: string;
  wagerEth: string;
  status: number;
  conditions: string;
  ethToUsdRate: number;
  address: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  makerDisplay,
  takerDisplay,
  judgeDisplay,
  wagerEth,
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

  const wagerInUsd = (
    parseFloat(wagerEth || "0") * (ethToUsdRate || 0)
  ).toFixed(2);
  const statusText =
    status === 4 ? "Resolved" : status === 5 ? "Invalidated" : "Open";

  const shareText = `Okay Bet Alert
Conditions: ${conditions || "N/A"}
Maker: ${shortenAddress(makerDisplay)}
Taker: ${shortenAddress(takerDisplay)}
Judge: ${shortenAddress(judgeDisplay)}
Wager: $${wagerInUsd} USD (${wagerEth || "0"} ETH)
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
